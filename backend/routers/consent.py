"""
Consent Management Router — FORGR Compliance

Endpoints:
- GET    /api/consent                   — Get current user's consent status
- POST   /api/consent                   — Grant consent to a specific type
- DELETE /api/consent/{consent_type}     — Revoke consent
- GET    /api/admin/consent-report       — Admin overview of all consent statuses
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_db, get_current_user, require_role
from audit import log_audit_event

logger = logging.getLogger("forgr.consent")

VALID_CONSENT_TYPES = {"data_processing", "analytics", "marketing", "third_party_sharing"}

router = APIRouter(tags=["Consent Management"])


def _get_client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.get("/api/consent", response_model=schemas.ConsentSummary)
def get_my_consent(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get current user's consent status for all types."""
    records = (
        db.query(models.ConsentRecord)
        .filter(models.ConsentRecord.user_id == current_user.id)
        .all()
    )

    consent_map = {r.consent_type: r.granted for r in records}
    return schemas.ConsentSummary(
        data_processing=consent_map.get("data_processing", False),
        analytics=consent_map.get("analytics", False),
        marketing=consent_map.get("marketing", False),
        third_party_sharing=consent_map.get("third_party_sharing", False),
        consents=[schemas.ConsentResponse.model_validate(r) for r in records],
    )


@router.post("/api/consent", response_model=schemas.ConsentResponse)
def grant_consent(
    payload: schemas.ConsentRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Grant consent to a specific type."""
    if payload.consent_type not in VALID_CONSENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid consent type. Must be one of: {', '.join(sorted(VALID_CONSENT_TYPES))}",
        )

    # Check for existing consent record
    existing = (
        db.query(models.ConsentRecord)
        .filter(
            models.ConsentRecord.user_id == current_user.id,
            models.ConsentRecord.consent_type == payload.consent_type,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    ip = _get_client_ip(request)

    if existing:
        existing.granted = payload.granted
        existing.granted_at = now if payload.granted else existing.granted_at
        existing.revoked_at = None if payload.granted else now
        existing.ip_address = ip
        existing.policy_version = payload.policy_version
        record = existing
    else:
        record = models.ConsentRecord(
            user_id=current_user.id,
            consent_type=payload.consent_type,
            granted=payload.granted,
            granted_at=now if payload.granted else None,
            revoked_at=None,
            ip_address=ip,
            policy_version=payload.policy_version,
        )
        db.add(record)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        action_type="consent_change",
        resource_type="consent",
        resource_id=payload.consent_type,
        details={"granted": payload.granted, "policy_version": payload.policy_version},
        ip_address=ip,
    )

    db.commit()
    db.refresh(record)
    return record


@router.delete("/api/consent/{consent_type}", response_model=schemas.ConsentResponse)
def revoke_consent(
    consent_type: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Revoke a specific consent type."""
    if consent_type not in VALID_CONSENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid consent type.")

    record = (
        db.query(models.ConsentRecord)
        .filter(
            models.ConsentRecord.user_id == current_user.id,
            models.ConsentRecord.consent_type == consent_type,
        )
        .first()
    )

    if record is None:
        raise HTTPException(status_code=404, detail="No consent record found for this type.")

    ip = _get_client_ip(request)
    record.granted = False
    record.revoked_at = datetime.now(timezone.utc)
    record.ip_address = ip

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        action_type="consent_change",
        resource_type="consent",
        resource_id=consent_type,
        details={"granted": False, "action": "revoked"},
        ip_address=ip,
    )

    db.commit()
    db.refresh(record)
    return record


@router.get("/api/admin/consent-report")
def admin_consent_report(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin")),
):
    """[ADMIN ONLY] Overview of consent status across all users."""
    from sqlalchemy import func as sa_func

    # Summary counts per consent type
    summary = (
        db.query(
            models.ConsentRecord.consent_type,
            sa_func.count(models.ConsentRecord.id).label("total"),
            sa_func.sum(
                sa_func.cast(models.ConsentRecord.granted, models.Integer)
            ).label("granted_count"),
        )
        .group_by(models.ConsentRecord.consent_type)
        .all()
    )

    # Recent consent records
    recent = (
        db.query(models.ConsentRecord)
        .order_by(models.ConsentRecord.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "summary": [
            {
                "consent_type": row.consent_type,
                "total_records": row.total,
                "granted_count": row.granted_count or 0,
                "revoked_count": (row.total or 0) - (row.granted_count or 0),
            }
            for row in summary
        ],
        "recent_records": [schemas.ConsentResponse.model_validate(r) for r in recent],
    }
