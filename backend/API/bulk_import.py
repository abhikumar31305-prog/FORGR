"""
Bulk CSV Import API Router (SRS FR-AA-5)

Allows faculty and admin users to upload CSV files for bulk import of
academic marks and attendance data.
"""

import io
import csv
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from typing import List

import crud
import models
from auth import get_db, get_current_user, require_role

router = APIRouter(prefix="/api/bulk-import", tags=["Bulk Import"])


def _parse_csv(content: bytes) -> List[dict]:
    """Parse uploaded CSV content into a list of row dicts."""
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    return [row for row in reader]


@router.post("/academics")
async def bulk_import_academics(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("faculty", "admin")),
):
    """
    Upload a CSV with columns: student_id, semester, cgpa, sgpa, backlogs,
    class_rank (optional), internal_avg (optional), external_avg (optional).
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    content = await file.read()
    rows = _parse_csv(content)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no data rows.")

    required_columns = {"student_id", "semester", "cgpa", "sgpa"}
    if not required_columns.issubset(rows[0].keys()):
        missing = required_columns - set(rows[0].keys())
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(sorted(missing))}",
        )

    imported = 0
    errors = []

    for i, row in enumerate(rows, start=2):  # start=2 because row 1 is the header
        try:
            student_id = row["student_id"].strip()
            student = db.query(models.Student).filter(
                models.Student.student_id == student_id
            ).first()
            if not student:
                errors.append(f"Row {i}: student_id '{student_id}' not found — skipped.")
                continue

            semester = int(row["semester"])
            existing = db.query(models.Academic).filter(
                models.Academic.student_id == student_id,
                models.Academic.semester == semester,
            ).first()

            data = {
                "cgpa": float(row["cgpa"]),
                "sgpa": float(row["sgpa"]),
                "backlogs": int(row.get("backlogs", 0) or 0),
                "class_rank": int(row["class_rank"]) if row.get("class_rank") else None,
                "internal_avg": float(row["internal_avg"]) if row.get("internal_avg") else None,
                "external_avg": float(row["external_avg"]) if row.get("external_avg") else None,
            }

            if existing:
                for k, v in data.items():
                    if v is not None:
                        setattr(existing, k, v)
            else:
                db.add(models.Academic(student_id=student_id, semester=semester, **data))

            # Trigger ML risk re-evaluation after data update (SRS FR-RP-5)
            crud.trigger_ml_risk_evaluation(db, student_id)

            # Audit logging (SRS FR-RB-4)
            crud.record_edit_action(
                db, "academics", student_id, current_user.email,
                "update" if existing else "create",
                field_changed="bulk_csv_import",
            )

            imported += 1
        except (ValueError, KeyError) as exc:
            errors.append(f"Row {i}: {exc}")

    db.commit()

    return {
        "imported": imported,
        "total_rows": len(rows),
        "errors": errors,
        "status": "completed_with_errors" if errors else "success",
    }


@router.post("/attendance")
async def bulk_import_attendance(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("faculty", "admin")),
):
    """
    Upload a CSV with columns: student_id, semester, attendance_percentage,
    classes_attended (optional), classes_conducted (optional).
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    content = await file.read()
    rows = _parse_csv(content)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no data rows.")

    required_columns = {"student_id", "semester", "attendance_percentage"}
    if not required_columns.issubset(rows[0].keys()):
        missing = required_columns - set(rows[0].keys())
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(sorted(missing))}",
        )

    imported = 0
    errors = []

    for i, row in enumerate(rows, start=2):
        try:
            student_id = row["student_id"].strip()
            student = db.query(models.Student).filter(
                models.Student.student_id == student_id
            ).first()
            if not student:
                errors.append(f"Row {i}: student_id '{student_id}' not found — skipped.")
                continue

            semester = int(row["semester"])
            att_pct = float(row["attendance_percentage"])

            existing = db.query(models.Attendance).filter(
                models.Attendance.student_id == student_id,
                models.Attendance.semester == semester,
            ).first()

            if existing:
                existing.attendance_percentage = att_pct
                existing.low_attendance = att_pct < 75.0
                if row.get("classes_attended"):
                    existing.classes_attended = int(row["classes_attended"])
                if row.get("classes_conducted"):
                    existing.classes_conducted = int(row["classes_conducted"])
            else:
                db.add(models.Attendance(
                    student_id=student_id,
                    semester=semester,
                    attendance_percentage=att_pct,
                    low_attendance=att_pct < 75.0,
                    classes_attended=int(row["classes_attended"]) if row.get("classes_attended") else None,
                    classes_conducted=int(row["classes_conducted"]) if row.get("classes_conducted") else None,
                ))

            crud.trigger_ml_risk_evaluation(db, student_id)

            crud.record_edit_action(
                db, "attendance", student_id, current_user.email,
                "update" if existing else "create",
                field_changed="bulk_csv_import",
            )

            imported += 1
        except (ValueError, KeyError) as exc:
            errors.append(f"Row {i}: {exc}")

    db.commit()

    return {
        "imported": imported,
        "total_rows": len(rows),
        "errors": errors,
        "status": "completed_with_errors" if errors else "success",
    }
