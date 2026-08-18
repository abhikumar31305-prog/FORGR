from pathlib import Path

import pandas as pd

try:
    from ..database import SessionLocal
    from ..models import Portfolio
    from .common import normalize_student_id
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from database import SessionLocal
    from models import Portfolio
    from imports.common import normalize_student_id


def import_portfolio():
    db = SessionLocal()
    try:
        csv_path = Path(__file__).resolve().parents[1] / ".." / "datasets" / "portfolio.csv"
        df = pd.read_csv(csv_path)
        for _, row in df.iterrows():
            student_id = normalize_student_id(row["student_id"])
            existing = db.query(Portfolio).filter(Portfolio.student_id == student_id).first()
            if existing:
                continue
            portfolio = Portfolio(
                student_id=student_id,
                projects=int(row["projects"]),
                certifications=int(row["certifications"]),
                github_repositories=int(row["github_repositories"]),
                github_score=int(row["github_score"]),
            )
            db.add(portfolio)
        db.commit()
        print("Portfolio imported successfully")
    finally:
        db.close()
