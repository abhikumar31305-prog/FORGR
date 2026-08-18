"""
Placement Tier Classification & Employability Scoring Inference Module

Loads `placement_model.pkl` to evaluate student readiness using:
- Placement Tier Classifier (RandomForestClassifier, max_depth=8)
- Employability Scoring Regressor (RandomForestRegressor, max_depth=8)
- Package Estimator Regressor (RandomForestRegressor, max_depth=8)
"""

from pathlib import Path
from typing import Any, Dict
import joblib
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "placement_model.pkl"

_MODEL_PAYLOAD = None

ALL_FEATURES = [
    "aptitude_score",
    "resume_score",
    "communication_score",
    "interview_readiness",
    "readiness_composite",
    "soft_hard_ratio",
]


def _load_model():
    global _MODEL_PAYLOAD
    if _MODEL_PAYLOAD is None and MODEL_PATH.exists():
        try:
            _MODEL_PAYLOAD = joblib.load(MODEL_PATH)
        except Exception as exc:
            print(f"Warning: Failed to load Placement Model: {exc}")


def predict_placement(
    aptitude_score: int = 70,
    resume_score: int = 70,
    communication_score: int = 70,
    interview_readiness: int = 70,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Predicts Employability Score (0-100), Placement Probability Tier ('Low', 'Medium', 'High'),
    and Estimated Package LPA.
    """
    _load_model()

    # Base rule baseline fallback
    composite = (aptitude_score + resume_score + communication_score + interview_readiness) / 4.0
    employability_score = round(composite, 1)
    probability = "Low"
    if employability_score >= 70:
        probability = "High"
    elif employability_score >= 50:
        probability = "Medium"

    estimated_lpa = round(max(3.0, employability_score * 0.12), 2)
    probabilities = {"Low": 0.33, "Medium": 0.33, "High": 0.34}

    if _MODEL_PAYLOAD and "classifier" in _MODEL_PAYLOAD:
        try:
            clf = _MODEL_PAYLOAD["classifier"]
            score_reg = _MODEL_PAYLOAD["score_regressor"]
            pkg_reg = _MODEL_PAYLOAD["pkg_regressor"]
            scaler = _MODEL_PAYLOAD["scaler"]
            features = _MODEL_PAYLOAD.get("all_features", ALL_FEATURES)

            soft_hard_ratio = (communication_score + interview_readiness) / (aptitude_score + resume_score + 1e-5)

            df_in = pd.DataFrame([{
                "aptitude_score": float(aptitude_score),
                "resume_score": float(resume_score),
                "communication_score": float(communication_score),
                "interview_readiness": float(interview_readiness),
                "readiness_composite": float(composite),
                "soft_hard_ratio": float(soft_hard_ratio),
            }])[features]

            X_scaled = scaler.transform(df_in)
            prob_pred = str(clf.predict(X_scaled)[0])
            score_pred = float(score_reg.predict(X_scaled)[0])
            pkg_pred = float(pkg_reg.predict(X_scaled)[0])

            probability = prob_pred
            employability_score = round(max(0.0, min(100.0, score_pred)), 1)
            estimated_lpa = round(max(0.0, pkg_pred), 2)

            if hasattr(clf, "predict_proba"):
                probs = clf.predict_proba(X_scaled)[0]
                classes = list(clf.classes_)
                probabilities = {cls: round(float(prob), 3) for cls, prob in zip(classes, probs)}
        except Exception as exc:
            print(f"Placement model inference fallback: {exc}")

    return {
        "employability_score": employability_score,
        "placement_probability": probability,
        "placement_tier": probability,
        "probabilities": probabilities,
        "estimated_package_lpa": estimated_lpa,
        "key_drivers": {
            "Aptitude": aptitude_score,
            "Resume": resume_score,
            "Communication": communication_score,
            "Interview Readiness": interview_readiness,
        },
    }
