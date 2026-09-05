"""
FORGR ML Monitoring Module

Provides:
- Prediction logging with confidence and input features
- Population Stability Index (PSI) based drift detection
- Monitoring metrics aggregation
"""

import json
import logging
import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

import models

logger = logging.getLogger("forgr.ml_monitoring")

# ── Training baseline distributions (from initial model training) ────
# These represent the expected distribution of input features during training.
# In production, these would be loaded from the model artifact or a config file.

TRAINING_BASELINES = {
    "backlog_risk": {
        "attendance_percentage": {"bins": [0, 50, 60, 70, 75, 80, 85, 90, 95, 100], "proportions": [0.02, 0.03, 0.05, 0.08, 0.12, 0.20, 0.25, 0.15, 0.10]},
        "cgpa": {"bins": [0, 3, 4, 5, 6, 7, 8, 9, 10], "proportions": [0.02, 0.03, 0.05, 0.10, 0.20, 0.30, 0.20, 0.10]},
        "backlogs": {"bins": [0, 1, 2, 3, 5, 10], "proportions": [0.60, 0.20, 0.10, 0.06, 0.04]},
        "coding_score": {"bins": [0, 50, 100, 150, 200, 300, 500], "proportions": [0.05, 0.10, 0.20, 0.30, 0.25, 0.10]},
    },
}

PSI_DRIFT_THRESHOLD = float(0.2)  # PSI > 0.2 indicates significant drift


# ── Prediction Logging ───────────────────────────────────────────────


def record_prediction(
    db: Session,
    student_id: str,
    model_type: str,
    prediction: str,
    confidence: Optional[float] = None,
    model_version: Optional[str] = None,
    input_features: Optional[Dict[str, Any]] = None,
) -> models.PredictionLog:
    """Log a prediction event for monitoring."""
    log_entry = models.PredictionLog(
        student_id=student_id,
        model_type=model_type,
        model_version=model_version,
        prediction=prediction,
        confidence=confidence,
        input_features_json=json.dumps(input_features) if input_features else None,
    )
    db.add(log_entry)
    return log_entry


# ── PSI Drift Detection ─────────────────────────────────────────────


def _calculate_psi(expected_proportions: List[float], actual_proportions: List[float]) -> float:
    """
    Calculate Population Stability Index between expected and actual distributions.
    PSI < 0.1: No significant change
    0.1 <= PSI < 0.2: Moderate shift
    PSI >= 0.2: Significant drift — retraining recommended
    """
    psi = 0.0
    epsilon = 1e-6  # Avoid log(0)
    for expected, actual in zip(expected_proportions, actual_proportions):
        expected = max(expected, epsilon)
        actual = max(actual, epsilon)
        psi += (actual - expected) * math.log(actual / expected)
    return round(psi, 6)


def _bin_values(values: List[float], bins: List[float]) -> List[float]:
    """Bin a list of values and return proportions per bin."""
    if not values:
        return [0.0] * (len(bins) - 1)
    counts = [0] * (len(bins) - 1)
    for v in values:
        for i in range(len(bins) - 1):
            if bins[i] <= v < bins[i + 1]:
                counts[i] += 1
                break
        else:
            # Value >= last bin edge
            counts[-1] += 1
    total = sum(counts)
    return [c / total if total > 0 else 0.0 for c in counts]


def detect_drift(
    db: Session,
    model_type: str,
    window_hours: int = 24,
) -> Optional[models.DriftReport]:
    """
    Detect feature drift by comparing recent predictions' input features
    against the training baseline using PSI.
    """
    baseline = TRAINING_BASELINES.get(model_type)
    if not baseline:
        logger.warning("No training baseline for model_type=%s — skipping drift check", model_type)
        return None

    window_start = datetime.now(timezone.utc) - timedelta(hours=window_hours)
    window_end = datetime.now(timezone.utc)

    recent_logs = (
        db.query(models.PredictionLog)
        .filter(
            models.PredictionLog.model_type == model_type,
            models.PredictionLog.created_at >= window_start,
            models.PredictionLog.input_features_json.isnot(None),
        )
        .all()
    )

    if len(recent_logs) < 10:
        logger.info("Insufficient predictions (%d) for drift detection on %s", len(recent_logs), model_type)
        return None

    # Parse input features from logs
    feature_values: Dict[str, List[float]] = {}
    for log_entry in recent_logs:
        try:
            features = json.loads(log_entry.input_features_json)
            for feat_name in baseline:
                if feat_name in features:
                    feature_values.setdefault(feat_name, []).append(float(features[feat_name]))
        except (json.JSONDecodeError, TypeError, ValueError):
            continue

    # Calculate PSI per feature
    feature_drifts = {}
    total_psi = 0.0
    for feat_name, config in baseline.items():
        values = feature_values.get(feat_name, [])
        if not values:
            continue
        actual_proportions = _bin_values(values, config["bins"])
        psi = _calculate_psi(config["proportions"], actual_proportions)
        feature_drifts[feat_name] = {"psi": psi, "drifted": psi >= PSI_DRIFT_THRESHOLD, "sample_count": len(values)}
        total_psi = max(total_psi, psi)  # Use max feature PSI as overall indicator

    is_drifted = total_psi >= PSI_DRIFT_THRESHOLD

    # Get current active model version
    active_model = (
        db.query(models.ModelRegistry)
        .filter(models.ModelRegistry.model_type == model_type, models.ModelRegistry.is_active.is_(True))
        .first()
    )

    report = models.DriftReport(
        model_type=model_type,
        model_version=active_model.model_version if active_model else None,
        psi_score=total_psi,
        feature_drifts_json=json.dumps(feature_drifts),
        is_drifted=is_drifted,
        window_start=window_start,
        window_end=window_end,
    )
    db.add(report)
    db.commit()

    if is_drifted:
        logger.warning(
            "DRIFT DETECTED for model %s (PSI=%.4f)",
            model_type,
            total_psi,
            extra={"model_type": model_type, "psi": total_psi, "features": feature_drifts},
        )
    else:
        logger.info("No drift detected for model %s (PSI=%.4f)", model_type, total_psi)

    return report


# ── Monitoring Metrics ───────────────────────────────────────────────


def get_monitoring_metrics(
    db: Session,
    model_type: str,
) -> dict:
    """
    Aggregate monitoring metrics for a model type:
    - Total predictions (all time)
    - Average confidence
    - Risk level distribution
    - Prediction volume (24h and 7d)
    - Latest drift report
    """
    now = datetime.now(timezone.utc)

    # Total predictions
    total = db.query(sa_func.count(models.PredictionLog.id)).filter(
        models.PredictionLog.model_type == model_type
    ).scalar() or 0

    # Average confidence
    avg_conf = db.query(sa_func.avg(models.PredictionLog.confidence)).filter(
        models.PredictionLog.model_type == model_type,
        models.PredictionLog.confidence.isnot(None),
    ).scalar() or 0.0

    # Risk distribution
    risk_dist_rows = (
        db.query(models.PredictionLog.prediction, sa_func.count(models.PredictionLog.id))
        .filter(models.PredictionLog.model_type == model_type)
        .group_by(models.PredictionLog.prediction)
        .all()
    )
    risk_distribution = {pred: count for pred, count in risk_dist_rows}

    # Volume 24h
    vol_24h = db.query(sa_func.count(models.PredictionLog.id)).filter(
        models.PredictionLog.model_type == model_type,
        models.PredictionLog.created_at >= now - timedelta(hours=24),
    ).scalar() or 0

    # Volume 7d
    vol_7d = db.query(sa_func.count(models.PredictionLog.id)).filter(
        models.PredictionLog.model_type == model_type,
        models.PredictionLog.created_at >= now - timedelta(days=7),
    ).scalar() or 0

    # Latest drift report
    latest_drift = (
        db.query(models.DriftReport)
        .filter(models.DriftReport.model_type == model_type)
        .order_by(models.DriftReport.created_at.desc())
        .first()
    )

    return {
        "model_type": model_type,
        "total_predictions": total,
        "avg_confidence": round(float(avg_conf), 4),
        "risk_distribution": risk_distribution,
        "recent_drift": latest_drift,
        "prediction_volume_24h": vol_24h,
        "prediction_volume_7d": vol_7d,
    }
