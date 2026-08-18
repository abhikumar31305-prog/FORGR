from pathlib import Path

import pandas as pd

try:
    from ..database import SessionLocal
    from ..models import RiskPrediction
    from .common import normalize_student_id
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from database import SessionLocal
    from models import RiskPrediction
    from imports.common import normalize_student_id


def import_risk_prediction():
    db = SessionLocal()
    try:
        csv_path = Path(__file__).resolve().parents[1] / ".." / "datasets" / "risk_prediction.csv"
        df = pd.read_csv(csv_path)
        for _, row in df.iterrows():
            student_id = normalize_student_id(row["student_id"])
            existing = db.query(RiskPrediction).filter(RiskPrediction.student_id == student_id).first()
            if existing:
                continue
            risk_prediction = RiskPrediction(
                student_id=student_id,
                backlog_risk=str(row["backlog_risk"]),
                attendance_risk=str(row["attendance_risk"]),
                placement_risk=str(row["placement_risk"]),
                overall_risk=str(row["overall_risk"]),
                ai_suggestion=str(row["ai_suggestion"]),
            )
            db.add(risk_prediction)
        db.commit()
        print("Risk prediction imported successfully")
    finally:
        db.close()
