from pathlib import Path

import pandas as pd

try:
    from ..database import SessionLocal
    from ..models import Student
    from .common import normalize_student_id
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from database import SessionLocal
    from models import Student
    from imports.common import normalize_student_id


def import_students():
    db = SessionLocal()
    try:
        csv_path = Path(__file__).resolve().parents[1] / ".." / "datasets" / "students.csv"
        df = pd.read_csv(csv_path)
        for _, row in df.iterrows():
            student_id = normalize_student_id(row["student_id"])
            existing = db.query(Student).filter(Student.student_id == student_id).first()
            if existing:
                continue
            student = Student(
                student_id=student_id,
                name=str(row["full_name"]),
                email=str(row["email"]),
                department=str(row["branch"]),
                year=int(row["year"]),
            )
            db.add(student)
        db.commit()
        print("Students imported successfully")
    finally:
        db.close()
