"""
FORGR Comprehensive Audit Logging

Provides a unified audit trail for:
- Role changes
- Data exports
- Record updates and deletions
- Bulk imports
- Model promotions
- Consent changes
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

import models

logger = logging.getLogger("forgr.audit")


def log_audit_event(
    db: Session,
    actor_email: str,
    actor_role: Optional[str],
    action_type: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
) -> models.AuditLog:
    """
    Create a comprehensive audit log entry.

    action_type: 'role_change', 'data_export', 'record_update', 'record_delete',
                 'bulk_import', 'model_promotion', 'consent_change', 'account_delete'
    resource_type: 'user', 'student', 'academic', 'attendance', 'skill', 'placement',
                   'portfolio', 'risk_prediction', 'model_registry', 'consent', etc.
    """
    entry = models.AuditLog(
        actor_email=actor_email,
        actor_role=actor_role,
        action_type=action_type,
        resource_type=resource_type,
        resource_id=resource_id,
        details_json=json.dumps(details) if details else None,
        ip_address=ip_address,
        request_id=request_id,
    )
    db.add(entry)
    # Don't commit here — let the caller manage the transaction
    logger.info(
        "Audit: %s by %s on %s/%s",
        action_type,
        actor_email,
        resource_type,
        resource_id or "N/A",
        extra={
            "action_type": action_type,
            "actor_email": actor_email,
            "resource_type": resource_type,
            "resource_id": resource_id,
        },
    )
    return entry


def log_role_change(
    db: Session,
    admin_email: str,
    target_email: str,
    old_role: str,
    new_role: str,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
) -> models.AuditLog:
    """Log a user role change."""
    return log_audit_event(
        db=db,
        actor_email=admin_email,
        actor_role="admin",
        action_type="role_change",
        resource_type="user",
        resource_id=target_email,
        details={"old_role": old_role, "new_role": new_role},
        ip_address=ip_address,
        request_id=request_id,
    )


def log_data_export(
    db: Session,
    actor_email: str,
    actor_role: str,
    export_type: str,
    record_count: int = 0,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
) -> models.AuditLog:
    """Log a data export event."""
    return log_audit_event(
        db=db,
        actor_email=actor_email,
        actor_role=actor_role,
        action_type="data_export",
        resource_type=export_type,
        details={"record_count": record_count},
        ip_address=ip_address,
        request_id=request_id,
    )


def log_record_deletion(
    db: Session,
    actor_email: str,
    actor_role: str,
    resource_type: str,
    resource_id: str,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
) -> models.AuditLog:
    """Log a record deletion."""
    return log_audit_event(
        db=db,
        actor_email=actor_email,
        actor_role=actor_role,
        action_type="record_delete",
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        request_id=request_id,
    )


def get_audit_trail(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    action_type: Optional[str] = None,
    resource_type: Optional[str] = None,
    actor_email: Optional[str] = None,
) -> list[models.AuditLog]:
    """Query the comprehensive audit trail with filtering."""
    query = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc())

    if action_type:
        query = query.filter(models.AuditLog.action_type == action_type)
    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type)
    if actor_email:
        query = query.filter(models.AuditLog.actor_email.ilike(f"%{actor_email}%"))

    return query.offset(offset).limit(limit).all()
