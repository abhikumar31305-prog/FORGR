"""
Placement Readiness API Router
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional

import crud
import models
from auth import get_db, require_role
from ml.placement.predict import predict_placement

router = APIRouter(prefix="/api/placement", tags=["Placement Readiness"])


class PlacementPredictionRequest(BaseModel):
    aptitude_score: int = Field(default=75, ge=0, le=100)
    resume_score: int = Field(default=75, ge=0, le=100)
    communication_score: int = Field(default=75, ge=0, le=100)
    interview_readiness: int = Field(default=75, ge=0, le=100)


@router.post("/predict")
def predict_placement_readiness(payload: PlacementPredictionRequest):
    """
    Predict employability score, placement probability, and estimated package LPA.
    """
    return predict_placement(
        aptitude_score=payload.aptitude_score,
        resume_score=payload.resume_score,
        communication_score=payload.communication_score,
        interview_readiness=payload.interview_readiness,
    )


@router.get("/student/{student_id}")
def get_student_placement_prediction(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "recruiter", "admin")),
):
    """
    Fetch student database placement metrics and predict placement probability and LPA.
    """
    try:
        placement_row = crud.get_student_placement(db, student_id)
        aptitude = placement_row.aptitude_score if placement_row else 70
        resume = placement_row.resume_score if placement_row else 70
        comm = placement_row.communication_score if placement_row else 70
        interview = placement_row.interview_readiness if placement_row else 70

        res = predict_placement(
            aptitude_score=aptitude,
            resume_score=resume,
            communication_score=comm,
            interview_readiness=interview,
        )
        res["student_id"] = student_id
        if placement_row:
            res["placed"] = placement_row.placed
            res["actual_package_lpa"] = placement_row.package_lpa
        return res
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
