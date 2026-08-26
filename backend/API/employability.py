"""
Employability API Router
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional

import crud
import models
from auth import get_db, get_current_user, require_role
from ml.employability.scoring import calculate_employability_score

router = APIRouter(prefix="/api/employability", tags=["Employability"])


class EmployabilityScoreRequest(BaseModel):
    aptitude_score: int = Field(default=70, ge=0, le=100)
    resume_score: int = Field(default=70, ge=0, le=100)
    communication_score: int = Field(default=70, ge=0, le=100)
    interview_readiness: int = Field(default=70, ge=0, le=100)
    coding_score: int = Field(default=150, ge=0)
    cgpa: float = Field(default=7.5, ge=0.0, le=10.0)
    projects: int = Field(default=2, ge=0)
    certifications: int = Field(default=1, ge=0)
    github_score: int = Field(default=65, ge=0, le=100)


@router.post("/score")
def compute_employability(payload: EmployabilityScoreRequest):
    """
    Compute employability score, readiness level, and category breakdown.
    """
    return calculate_employability_score(
        aptitude_score=payload.aptitude_score,
        resume_score=payload.resume_score,
        communication_score=payload.communication_score,
        interview_readiness=payload.interview_readiness,
        coding_score=payload.coding_score,
        cgpa=payload.cgpa,
        projects=payload.projects,
        certifications=payload.certifications,
        github_score=payload.github_score,
    )


@router.get("/student/{student_id}")
def get_student_employability(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "admin")),
):
    """
    Fetch student DB profile metrics and evaluate their employability score breakdown.
    """
    try:
        profile = crud.build_profile_response(db, student_id)
        placement_row = crud.get_student_placement(db, student_id)
        skill_row = crud.get_student_skills(db, student_id)
        portfolio_row = crud.get_student_portfolio(db, student_id)

        aptitude = placement_row.aptitude_score if placement_row else 70
        resume = placement_row.resume_score if placement_row else 70
        comm = placement_row.communication_score if placement_row else 70
        interview = placement_row.interview_readiness if placement_row else 70

        coding_score = skill_row.coding_score if skill_row else 150
        projects = portfolio_row.projects if portfolio_row else 1
        certifications = portfolio_row.certifications if portfolio_row else 0
        github_score = portfolio_row.github_score if portfolio_row else 50

        result = calculate_employability_score(
            aptitude_score=aptitude,
            resume_score=resume,
            communication_score=comm,
            interview_readiness=interview,
            coding_score=coding_score,
            cgpa=profile.cgpa,
            projects=projects,
            certifications=certifications,
            github_score=github_score,
        )
        result["student_id"] = student_id
        result["student_name"] = profile.student_name
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
