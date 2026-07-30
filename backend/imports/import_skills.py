from pathlib import Path

import pandas as pd

try:
    from ..database import SessionLocal
    from ..models import Skill
    from .common import normalize_student_id
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from database import SessionLocal
    from models import Skill
    from imports.common import normalize_student_id


def import_skills():
    db = SessionLocal()
    try:
        csv_path = Path(__file__).resolve().parents[1] / ".." / "datasets" / "skills.csv"
        df = pd.read_csv(csv_path)
        for _, row in df.iterrows():
            student_id = normalize_student_id(row["student_id"])
            existing = db.query(Skill).filter(Skill.student_id == student_id).first()
            if existing:
                continue
            skill = Skill(
                student_id=student_id,
                python=int(row["python"]),
                java=int(row["java"]),
                sql=int(row["sql"]),
                machine_learning=int(row["machine_learning"]),
                data_science=int(row["data_science"]),
                communication=int(row["communication"]),
                coding_score=int(row["coding_score"]),
            )
            db.add(skill)
        db.commit()
        print("Skills imported successfully")
    finally:
        db.close()
