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
