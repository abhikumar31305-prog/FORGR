"""Import all CSV datasets into the database.

Run from the backend directory:
    python import_data.py
"""
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import inspect

from database import Base, SessionLocal, engine
import models  # noqa: F401  – ensures all models are registered

DATASETS_DIR = Path(__file__).resolve().parent.parent / "datasets"

def _table_is_empty(db, model) -> bool:
    """Return True if the given database table has no records."""
    return db.query(model).first() is None


def _clean_sid(raw) -> str:
    if pd.isna(raw):
        return ""
    if isinstance(raw, (int, float)):
        return str(int(raw))
    return str(raw).replace(".0", "").strip()


def _table_is_empty(db, model) -> bool:
    return db.query(model).first() is None



def import_students(db, force=False):
    if not force and not _table_is_empty(db, models.Student):
        print("  [SKIP]  students table already populated – skipping")
        return
    if force:
        db.query(models.Student).delete()

    df = pd.read_csv(DATASETS_DIR / "students.csv")
    for _, row in df.iterrows():
        db.add(models.Student(
            student_id=_clean_sid(row["student_id"]),
            roll_no=str(row["roll_no"]) if pd.notna(row.get("roll_no")) else None,
            name=str(row.get("full_name") or row.get("name")),
            gender=str(row.get("gender")) if pd.notna(row.get("gender")) else None,
            email=str(row.get("email")),
            phone=str(row.get("phone")) if pd.notna(row.get("phone")) else None,
            department=str(row.get("branch") or row.get("department", "CSE")),
            year=int(row.get("year", 1)),
            semester=int(row["semester"]) if pd.notna(row.get("semester")) else None,
            section=str(row["section"]) if pd.notna(row.get("section")) else None,
        ))
    db.commit()
    print(f"  [OK] Imported {len(df)} students")


def import_academics(db, force=False):
    if not force and not _table_is_empty(db, models.Academic):
        print("  [SKIP]  academics table already populated – skipping")
        return
    if force:
        db.query(models.Academic).delete()

    df = pd.read_csv(DATASETS_DIR / "academics.csv")
    for _, row in df.iterrows():
        db.add(models.Academic(
            student_id=_clean_sid(row["student_id"]),
            semester=int(row["semester"]),
            cgpa=float(row["cgpa"]),
            sgpa=float(row["sgpa"]),
            class_rank=int(row["class_rank"]) if pd.notna(row.get("class_rank")) else None,
            backlogs=int(row.get("backlogs", 0)),
            internal_avg=float(row["internal_avg"]) if pd.notna(row.get("internal_avg")) else None,
            external_avg=float(row["external_avg"]) if pd.notna(row.get("external_avg")) else None,
        ))
    db.commit()
    print(f"  [OK]  Imported {len(df)} academic records")


def import_attendance(db, force=False):
    if not force and not _table_is_empty(db, models.Attendance):
        print("  [SKIP]  attendance table already populated – skipping")
        return
    if force:
        db.query(models.Attendance).delete()

    df = pd.read_csv(DATASETS_DIR / "attendance.csv")
    for _, row in df.iterrows():
        low_att = row.get("low_attendance", False)
        if isinstance(low_att, str):
            low_att = low_att.strip().lower() == "true"
        db.add(models.Attendance(
            student_id=_clean_sid(row["student_id"]),
            semester=int(row["semester"]),
            attendance_percentage=float(row["attendance_percentage"]),
            classes_attended=int(row["classes_attended"]) if pd.notna(row.get("classes_attended")) else None,
            classes_conducted=int(row["classes_conducted"]) if pd.notna(row.get("classes_conducted")) else None,
            low_attendance=bool(low_att),
        ))
    db.commit()
    print(f"  [OK]  Imported {len(df)} attendance records")


def import_skills(db, force=False):
    if not force and not _table_is_empty(db, models.Skill):
        print("  [SKIP]  skills table already populated – skipping")
        return
    if force:
        db.query(models.Skill).delete()

    df = pd.read_csv(DATASETS_DIR / "skills.csv")
    for _, row in df.iterrows():
        db.add(models.Skill(
            student_id=_clean_sid(row["student_id"]),
            python=int(row.get("python", 0)),
            java=int(row.get("java", 0)),
            sql=int(row.get("sql", 0)),
            machine_learning=int(row.get("machine_learning", 0)),
            data_science=int(row.get("data_science", 0)),
            communication=int(row.get("communication", 0)),
            coding_score=int(row.get("coding_score", 0)),
        ))
    db.commit()
    print(f"  [OK]  Imported {len(df)} skill records")


def import_placement(db, force=False):
    if not force and not _table_is_empty(db, models.Placement):
        print("  [SKIP]  placements table already populated – skipping")
        return
    if force:
        db.query(models.Placement).delete()

    df = pd.read_csv(DATASETS_DIR / "placement.csv")
    for _, row in df.iterrows():
        db.add(models.Placement(
            student_id=_clean_sid(row["student_id"]),
            aptitude_score=int(row.get("aptitude_score", 0)),
            resume_score=int(row.get("resume_score", 0)),
            communication_score=int(row.get("communication_score", 0)),
            interview_readiness=int(row.get("interview_readiness", 0)),
            employability_score=float(row.get("employability_score", 0.0)),
            placement_probability=str(row.get("placement_probability", "Low")),
            placed=bool(int(row.get("placed", 0))),
            package_lpa=float(row.get("package_lpa", 0.0)),
        ))
    db.commit()
    print(f"  [OK]  Imported {len(df)} placement records")


def import_portfolio(db, force=False):
    if not force and not _table_is_empty(db, models.Portfolio):
        print("  [SKIP]  portfolios table already populated – skipping")
        return
    if force:
        db.query(models.Portfolio).delete()

    df = pd.read_csv(DATASETS_DIR / "portfolio.csv")
    for _, row in df.iterrows():
        db.add(models.Portfolio(
            student_id=_clean_sid(row["student_id"]),
            projects=int(row.get("projects", 0)),
            certifications=int(row.get("certifications", 0)),
            github_repositories=int(row.get("github_repositories", 0)),
            github_score=int(row.get("github_score", 0)),
        ))
    db.commit()
    print(f"  [OK]  Imported {len(df)} portfolio records")


def import_risk_predictions(db, force=False):
    if not force and not _table_is_empty(db, models.RiskPrediction):
        print("  [SKIP]  risk_predictions table already populated – skipping")
        return
    if force:
        db.query(models.RiskPrediction).delete()

    df = pd.read_csv(DATASETS_DIR / "risk_prediction.csv")
    for _, row in df.iterrows():
        db.add(models.RiskPrediction(
            student_id=_clean_sid(row["student_id"]),
            backlog_risk=str(row.get("backlog_risk", "Low")),
            attendance_risk=str(row.get("attendance_risk", "Low")),
            placement_risk=str(row.get("placement_risk", "Low")),
            overall_risk=str(row.get("overall_risk", "Low")),
            ai_suggestion=str(row.get("ai_suggestion", "")) if pd.notna(row.get("ai_suggestion")) else None,
            dropout_risk=str(row.get("dropout_risk", "Low")) if pd.notna(row.get("dropout_risk")) else "Low",
        ))
    db.commit()
    print(f"  [OK]  Imported {len(df)} risk prediction records")


def main():
    force = "--force" in sys.argv or "-f" in sys.argv
    print("FORGR Data Import" + (" (FORCE REFRESH)" if force else ""))
    print("=" * 40)

    # Create all tables (including new ones)
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created/verified\n")

    db = SessionLocal()
    try:
        root_dir = Path(__file__).resolve().parent.parent
        unified_csv = root_dir / "combined_student_data_different.csv"

        if unified_csv.exists():
            print(f"[INFO] Found unified user dataset: {unified_csv.name}")
            from API.bulk_import import _parse_csv, _process_unified_dataset_rows
            with open(unified_csv, "rb") as f:
                content = f.read()
            rows = _parse_csv(content)
            res = _process_unified_dataset_rows(
                db=db,
                rows=rows,
                current_user_email="system@forgr.app",
                replace_existing=force or _table_is_empty(db, models.Student),
            )
            print(f"  [OK] Processed {res['imported']} records from {unified_csv.name}")
            if res.get("analysis_report"):
                rep = res["analysis_report"]
                print(f"  [ANALYSIS] Health: {rep['cohort_health']}, Avg CGPA: {rep['avg_cgpa']}, Avg Att: {rep['avg_attendance']}%, Avg Employability: {rep['avg_employability']}")
        else:
            import_students(db, force=force)
            import_academics(db, force=force)
            import_attendance(db, force=force)
            import_skills(db, force=force)
            import_placement(db, force=force)
            import_portfolio(db, force=force)
            import_risk_predictions(db, force=force)

        # Ensure essential demo auth users exist
        import crud
        crud.seed_default_auth_users(db)

        print("\n[SUCCESS] All datasets imported and synchronized successfully!")
    except Exception as exc:
        db.rollback()
        print(f"\n[ERROR] Import failed: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()



if __name__ == "__main__":
    main()