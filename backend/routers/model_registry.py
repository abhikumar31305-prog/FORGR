"""
Model Registry Router — FORGR ML Model Management

Endpoints:
- GET  /api/models                     — List all registered models
- GET  /api/models/{model_type}/active — Get active model for a type
- POST /api/models                     — Register a new model (admin only)
- PUT  /api/models/{id}/activate       — Promote a model to active (admin only)
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_db, require_role
from audit import log_audit_event

logger = logging.getLogger("forgr.model_registry")

router = APIRouter(prefix="/api/models", tags=["Model Registry"])


@router.get("", response_model=list[schemas.ModelRegistryResponse])
def list_models(
    model_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin", "faculty")),
):
    """List all registered models, optionally filtered by type."""
    query = db.query(models.ModelRegistry).order_by(models.ModelRegistry.created_at.desc())
    if model_type:
        query = query.filter(models.ModelRegistry.model_type == model_type)
    return query.offset(offset).limit(limit).all()


@router.get("/{model_type}/active", response_model=schemas.ModelRegistryResponse)
def get_active_model(
    model_type: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin", "faculty")),
):
    """Get the currently active model for a given type."""
    model = (
        db.query(models.ModelRegistry)
        .filter(
            models.ModelRegistry.model_type == model_type,
            models.ModelRegistry.is_active.is_(True),
        )
        .first()
    )
    if model is None:
        raise HTTPException(status_code=404, detail=f"No active model found for type '{model_type}'.")
    return model


@router.post("", response_model=schemas.ModelRegistryResponse, status_code=201)
def register_model(
    payload: schemas.ModelRegistryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    """Register a new model version."""
    entry = models.ModelRegistry(
        model_name=payload.model_name,
        model_version=payload.model_version,
        model_type=payload.model_type,
        file_path=payload.file_path,
        metrics_json=payload.metrics_json,
        is_active=False,
    )
    db.add(entry)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role="admin",
        action_type="model_registration",
        resource_type="model_registry",
        resource_id=f"{payload.model_type}/{payload.model_version}",
        details={"model_name": payload.model_name, "file_path": payload.file_path},
    )

    db.commit()
    db.refresh(entry)
    logger.info(
        "Model registered: %s v%s (type=%s)",
        payload.model_name,
        payload.model_version,
        payload.model_type,
    )
    return entry


@router.put("/{model_id}/activate", response_model=schemas.ModelRegistryResponse)
def activate_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    """Promote a model to active, deactivating the previous active model of the same type."""
    model = db.query(models.ModelRegistry).filter(models.ModelRegistry.id == model_id).first()
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found.")

    # Deactivate all other models of the same type
    db.query(models.ModelRegistry).filter(
        models.ModelRegistry.model_type == model.model_type,
        models.ModelRegistry.is_active.is_(True),
    ).update({"is_active": False})

    # Activate the target model
    model.is_active = True
    model.promoted_at = datetime.now(timezone.utc)
    model.promoted_by = current_user.email

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role="admin",
        action_type="model_promotion",
        resource_type="model_registry",
        resource_id=str(model_id),
        details={
            "model_name": model.model_name,
            "model_version": model.model_version,
            "model_type": model.model_type,
        },
    )

    db.commit()
    db.refresh(model)
    logger.info("Model activated: %s v%s (id=%d)", model.model_name, model.model_version, model_id)
    return model
