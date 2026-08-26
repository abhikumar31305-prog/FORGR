"""
Student Risk Prediction Inference & Prescriptive Action Engine

Loads `backlog_model.pkl` to predict student risk category (Low / Medium / High)
from 7 input features:
- attendance_percentage
- cgpa
- backlogs
- coding_score
- projects
- python
- communication

Generates customized interventions (LeetCode practice, Attendance warnings, Remedial sessions).
"""

from pathlib import Path
from typing import Any, Dict, List
import joblib
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "backlog_model.pkl"

_MODEL_PAYLOAD = None

BASE_FEATURES = [
    "attendance_percentage",
    "cgpa",
    "backlogs",
    "coding_score",
    "projects",
    "python",
    "communication",
]

ALL_FEATURES = [
    "attendance_percentage",
    "cgpa",
    "backlogs",
    "coding_score",
    "projects",
    "python",
    "communication",
    "tech_composite",
    "academic_health",
    "overall_readiness_index",
]


def _load_model():
    global _MODEL_PAYLOAD
    if _MODEL_PAYLOAD is None and MODEL_PATH.exists():
        try:
            _MODEL_PAYLOAD = joblib.load(MODEL_PATH)
        except Exception as exc:
            print(f"Warning: Failed to load Risk Prediction Model: {exc}")


def predict_backlog_risk(
    attendance_percentage: float = 85.0,
    cgpa: float = 7.5,
    backlogs: int = 0,
    coding_score: int = 150,
    projects: int = 1,
    python: int = 70,
    communication: int = 70,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Predicts Risk Category ('Low', 'Medium', 'High'), confidence probability,
    feature importance breakdown, and customized interventions.
    """
    _load_model()

    # Domain feature engineering
    tech_comp = (coding_score / 300.0 * 50.0) + (python / 100.0 * 50.0)
    academic_h = (cgpa * 10.0) - (backlogs * 15.0)
    readiness_idx = (
        (attendance_percentage * 0.3)
        + (cgpa * 5.0)
        + (tech_comp * 0.2)
        - (backlogs * 10.0)
    )

    # Baseline rule fallback
    risk_level = "Low"
    if backlogs >= 2 or attendance_percentage < 70 or cgpa < 5.5:
        risk_level = "High"
    elif backlogs == 1 or attendance_percentage < 80 or cgpa < 6.8:
        risk_level = "Medium"

    probabilities = {"Low": 0.33, "Medium": 0.33, "High": 0.34}
    feature_importances = {}

    if _MODEL_PAYLOAD and "model" in _MODEL_PAYLOAD:
        try:
            model = _MODEL_PAYLOAD["model"]
            scaler = _MODEL_PAYLOAD["scaler"]
            features = _MODEL_PAYLOAD.get("all_features", ALL_FEATURES)

            df_in = pd.DataFrame([{
                "attendance_percentage": float(attendance_percentage),
                "cgpa": float(cgpa),
                "backlogs": int(backlogs),
                "coding_score": float(coding_score),
                "projects": int(projects),
                "python": float(python),
                "communication": float(communication),
                "tech_composite": float(tech_comp),
                "academic_health": float(academic_h),
                "overall_readiness_index": float(readiness_idx),
            }])[features]

            X_scaled = scaler.transform(df_in)
            risk_level = str(model.predict(X_scaled)[0])

            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(X_scaled)[0]
                classes = list(model.classes_)
                probabilities = {cls: round(float(prob), 3) for cls, prob in zip(classes, probs)}

            if "feature_importances" in _MODEL_PAYLOAD:
                feature_importances = _MODEL_PAYLOAD["feature_importances"]
        except Exception as exc:
            print(f"Risk model inference fallback: {exc}")

    # Prescriptive Action Engine - Customized Interventions
    interventions: List[str] = []
    if coding_score < 180 or python < 65:
        interventions.append("LeetCode practice & Data Structures problem-solving (Target: 3 problems/day).")
    if attendance_percentage < 75:
        interventions.append(f"Attendance warning issued! Current: {attendance_percentage:.1f}%. Must attend upcoming lectures.")
    if backlogs > 0:
        interventions.append(f"Remedial clearing sessions mandated for {backlogs} pending backlog subject(s).")
    if projects < 2:
        interventions.append("Build & document at least 1 new portfolio project to improve technical readiness.")
    if communication < 65:
        interventions.append("Attend soft-skills and technical mock interview training sessions.")

    if not interventions:
        interventions.append("Academic & technical status is optimal. Maintain current practice.")

    return {
        "backlog_risk": risk_level,
        "risk_category": risk_level,
        "probabilities": probabilities,
        "customized_interventions": interventions,
        "suggestions": interventions,
        "ai_suggestion": " ".join(interventions),
        "input_features": {
            "attendance_percentage": attendance_percentage,
            "cgpa": cgpa,
            "backlogs": backlogs,
            "coding_score": coding_score,
            "projects": projects,
            "python": python,
            "communication": communication,
        },
    }
