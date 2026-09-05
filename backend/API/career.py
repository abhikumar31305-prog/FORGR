"""
Career Recommendation API Router
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional

import crud
import models
from auth import check_student_access, get_db, require_role
from ml.career.recommend import recommend_careers

router = APIRouter(prefix="/api/career", tags=["Career Recommendation"])


class CareerRecommendationRequest(BaseModel):
    skills: Dict[str, int] = Field(
        default_factory=lambda: {
            "python": 75,
            "sql": 70,
            "machine_learning": 60,
            "communication": 80,
        }
    )
    cgpa: float = Field(default=7.5, ge=0.0, le=10.0)
    coding_score: int = Field(default=160, ge=0)
    projects: int = Field(default=2, ge=0)
    top_n: int = Field(default=3, ge=1, le=10)


@router.post("/recommend")
def get_career_recommendations(payload: CareerRecommendationRequest):
    """
    Recommend top career paths matching student skill profile and metrics.
    """
    return recommend_careers(
        student_skills=payload.skills,
        cgpa=payload.cgpa,
        coding_score=payload.coding_score,
        projects=payload.projects,
        top_n=payload.top_n,
    )


@router.get("/student/{student_id}")
def get_student_career_recommendations(
    student_id: str,
    top_n: int = 3,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "admin")),
):
    check_student_access(current_user, student_id, db)
    """
    Fetch student database skills, academic, and portfolio metrics to generate career recommendations.
    """
    try:
        profile = crud.build_profile_response(db, student_id)
        skill_row = crud.get_student_skills(db, student_id)
        portfolio_row = crud.get_student_portfolio(db, student_id)

        skills_dict = {}
        coding_score = 150
        if skill_row:
            skills_dict = {
                "python": skill_row.python,
                "java": skill_row.java,
                "sql": skill_row.sql,
                "machine_learning": skill_row.machine_learning,
                "data_science": skill_row.data_science,
                "communication": skill_row.communication,
            }
            coding_score = skill_row.coding_score

        projects = portfolio_row.projects if portfolio_row else 1

        recommendations = recommend_careers(
            student_skills=skills_dict,
            cgpa=profile.cgpa,
            coding_score=coding_score,
            projects=projects,
            top_n=top_n,
        )

        return {
            "student_id": student_id,
            "student_name": profile.student_name,
            "recommendations": recommendations,
        }
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
