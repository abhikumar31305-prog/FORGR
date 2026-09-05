"""
ML Monitoring Router — FORGR ML Observability

Endpoints:
- GET  /api/ml/monitoring/metrics       — Get monitoring metrics for a model type
- GET  /api/ml/monitoring/drift         — Get latest drift reports
- POST /api/ml/monitoring/drift/check   — Trigger a drift detection check (admin only)
- GET  /api/ml/monitoring/predictions   — Get recent prediction logs
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
import ml_monitoring
from auth import get_db, require_role

logger = logging.getLogger("forgr.ml_monitoring_router")

router = APIRouter(prefix="/api/ml/monitoring", tags=["ML Monitoring"])


@router.get("/metrics", response_model=schemas.MonitoringMetricsResponse)
def get_metrics(
    model_type: str = Query(default="backlog_risk"),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin", "faculty")),
):
    """Get aggregated monitoring metrics for a model type."""
    result = ml_monitoring.get_monitoring_metrics(db, model_type)
    return result


@router.get("/drift", response_model=list[schemas.DriftReportResponse])
def get_drift_reports(
    model_type: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin", "faculty")),
):
    """Get recent drift detection reports."""
    query = db.query(models.DriftReport).order_by(models.DriftReport.created_at.desc())
    if model_type:
        query = query.filter(models.DriftReport.model_type == model_type)
    return query.limit(limit).all()


@router.post("/drift/check", response_model=schemas.DriftReportResponse)
def trigger_drift_check(
    model_type: str = Query(default="backlog_risk"),
    window_hours: int = Query(default=24, ge=1, le=720),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin")),
):
    """Trigger a drift detection check for a model type."""
    report = ml_monitoring.detect_drift(db, model_type, window_hours)
    if report is None:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient data for drift detection on model type '{model_type}'. Need at least 10 predictions.",
        )
    return report


@router.get("/predictions", response_model=list[schemas.PredictionLogResponse])
def get_prediction_logs(
    model_type: str | None = Query(default=None),
    student_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin", "faculty")),
):
    """Get recent prediction logs with optional filtering."""
    query = db.query(models.PredictionLog).order_by(models.PredictionLog.created_at.desc())
    if model_type:
        query = query.filter(models.PredictionLog.model_type == model_type)
    if student_id:
        query = query.filter(models.PredictionLog.student_id == student_id)
    return query.offset(offset).limit(limit).all()
