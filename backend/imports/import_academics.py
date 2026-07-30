from pathlib import Path

import pandas as pd

try:
    from ..database import SessionLocal
    from ..models import Academic
    from .common import normalize_student_id
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from database import SessionLocal
    from models import Academic
    from imports.common import normalize_student_id


def import_academics():
    db = SessionLocal()
    try:
        csv_path = Path(__file__).resolve().parents[1] / ".." / "datasets" / "academics.csv"
        df = pd.read_csv(csv_path)
        for _, row in df.iterrows():
            student_id = normalize_student_id(row["student_id"])
            existing = db.query(Academic).filter(Academic.student_id == student_id).first()
            if existing:
                continue
            academic = Academic(
                student_id=student_id,
                semester=int(row["semester"]),
                cgpa=float(row["cgpa"]),
                sgpa=float(row["sgpa"]),
                class_rank=int(row["class_rank"]),
                backlogs=int(row["backlogs"]),
                internal_avg=float(row["internal_avg"]),
                external_avg=float(row["external_avg"]),
            )
            db.add(academic)
        db.commit()
        print("Academics imported successfully")
    finally:
        db.close()
