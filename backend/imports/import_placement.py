from pathlib import Path

import pandas as pd

try:
    from ..database import SessionLocal
    from ..models import Placement
    from .common import normalize_student_id
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from database import SessionLocal
    from models import Placement
    from imports.common import normalize_student_id


def import_placement():
    db = SessionLocal()
    try:
        csv_path = Path(__file__).resolve().parents[1] / ".." / "datasets" / "placement.csv"
        df = pd.read_csv(csv_path)
        for _, row in df.iterrows():
            student_id = normalize_student_id(row["student_id"])
            existing = db.query(Placement).filter(Placement.student_id == student_id).first()
            if existing:
                continue
            placement = Placement(
                student_id=student_id,
                aptitude_score=int(row["aptitude_score"]),
                resume_score=int(row["resume_score"]),
                communication_score=int(row["communication_score"]),
                interview_readiness=int(row["interview_readiness"]),
                employability_score=float(row["employability_score"]),
                placement_probability=str(row["placement_probability"]),
                placed=int(row["placed"]),
                package_lpa=float(row["package_lpa"]),
            )
            db.add(placement)
        db.commit()
        print("Placement imported successfully")
    finally:
        db.close()
