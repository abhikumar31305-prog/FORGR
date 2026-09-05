"""
FORGR Real-time ML Prediction Service (Unified Interface)

Delegates inference to modular ML sub-packages in `ml/`:
- `ml.backlog.predict` (Student Risk Prediction Model - 7 features)
- `ml.placement.predict` (Placement Tier & Package Model - 4 readiness features)
- `ml.employability.scoring` (Employability Scoring Engine)
- `ml.career.recommend` (Career Recommendation Engine)
"""

from typing import Tuple
from ml.backlog.predict import predict_backlog_risk
from ml.placement.predict import predict_placement
from ml.employability.scoring import calculate_employability_score
from ml.career.recommend import recommend_careers


def predict_risk(
    attendance_percentage: float = 85.0,
    cgpa: float = 7.5,
    backlogs: int = 0,
    coding_score: int = 150,
    projects: int = 1,
    python: int = 70,
    communication: int = 70,
    **kwargs,
) -> dict:
    """
    Returns full risk dictionary with individual risk flags, ai suggestion,
    and model versioning metadata.
    """
    res = predict_backlog_risk(
        attendance_percentage=attendance_percentage,
        cgpa=cgpa,
        backlogs=backlogs,
        coding_score=coding_score,
        projects=projects,
        python=python,
        communication=communication,
        **kwargs,
    )
    overall = res.get("backlog_risk", "Low")
    ai_sugg = res.get("ai_suggestion", "Maintain consistent academic & coding progress.")
    att_risk = "High" if attendance_percentage < 65 else ("Medium" if attendance_percentage < 75 else "Low")
    bk_risk = "High" if backlogs >= 2 else ("Medium" if backlogs == 1 else "Low")
    plc_risk = "High" if cgpa < 5.5 else ("Medium" if cgpa < 6.5 else "Low")
    dropout = "High" if (attendance_percentage < 60 and backlogs >= 3) else ("Medium" if (attendance_percentage < 70 and backlogs >= 2) else "Low")

    # Extract model confidence from probabilities
    probabilities = res.get("probabilities", {})
    confidence = probabilities.get(overall, None)

    return {
        "overall_risk": overall,
        "backlog_risk": bk_risk,
        "attendance_risk": att_risk,
        "placement_risk": plc_risk,
        "dropout_risk": dropout,
        "ai_suggestion": ai_sugg,
        "model_version": "1.0.0",
        "model_name": "backlog_risk_v1",
        "confidence": confidence,
    }


def predict_student_risk(
    attendance_percentage: float,
    cgpa: float,
    backlogs: int,
    coding_score: int = 150,
    projects: int = 1,
    python: int = 70,
    communication: int = 70,
) -> Tuple[str, str]:
    """
    Predicts overall Risk Category ('Low', 'Medium', 'High')
    and generates prescriptive action engine interventions.
    """
    res = predict_backlog_risk(
        attendance_percentage=attendance_percentage,
        cgpa=cgpa,
        backlogs=backlogs,
        coding_score=coding_score,
        projects=projects,
        python=python,
        communication=communication,
    )
    return res["backlog_risk"], res["ai_suggestion"]


def predict_placement_readiness(
    aptitude_score: int,
    resume_score: int,
    communication_score: int,
    interview_readiness: int,
) -> Tuple[float, str]:
    """
    Predicts employability_score (0-100) and placement_probability ('Low', 'Medium', 'High').
    """
    res = predict_placement(
        aptitude_score=aptitude_score,
        resume_score=resume_score,
        communication_score=communication_score,
        interview_readiness=interview_readiness,
    )
    return res["employability_score"], res["placement_probability"]
