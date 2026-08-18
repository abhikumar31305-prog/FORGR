from pathlib import Path

import pandas as pd

try:
    from ..database import SessionLocal
    from ..models import Attendance
    from .common import normalize_student_id
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from database import SessionLocal
    from models import Attendance
    from imports.common import normalize_student_id


def import_attendance():
    db = SessionLocal()
    try:
        csv_path = Path(__file__).resolve().parents[1] / ".." / "datasets" / "attendance.csv"
        df = pd.read_csv(csv_path)
        for _, row in df.iterrows():
            student_id = normalize_student_id(row["student_id"])
            existing = db.query(Attendance).filter(Attendance.student_id == student_id).first()
            if existing:
                continue
            attendance = Attendance(
                student_id=student_id,
                semester=int(row["semester"]),
                attendance_percentage=float(row["attendance_percentage"]),
                classes_attended=int(row["classes_attended"]),
                classes_conducted=int(row["classes_conducted"]),
                low_attendance=bool(row["low_attendance"]),
            )
            db.add(attendance)
        db.commit()
        print("Attendance imported successfully")
    finally:
        db.close()
