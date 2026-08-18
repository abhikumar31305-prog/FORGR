"""
Placement Probability & Employability Scoring Model Training Script

Trains:
1. Placement Probability Classifier (RandomForestClassifier, n_estimators=100, max_depth=8)
2. Employability Scoring Regressor (RandomForestRegressor, n_estimators=100, max_depth=8)
3. Package Estimation Regressor (RandomForestRegressor, n_estimators=100, max_depth=8)

Inputs (4 Readiness Features):
- aptitude_score
- resume_score
- communication_score
- interview_readiness

Saves payload to `backend/ml/placement/placement_model.pkl`.
"""

import sys
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report, mean_squared_error, r2_score

BASE_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BASE_DIR.parent.parent.parent / "datasets"
MODEL_PATH = BASE_DIR / "placement_model.pkl"

BASE_FEATURES = [
    "aptitude_score",
    "resume_score",
    "communication_score",
    "interview_readiness",
]

ENGINEERED_FEATURES = [
    "readiness_composite",
    "soft_hard_ratio",
]

ALL_FEATURES = BASE_FEATURES + ENGINEERED_FEATURES


def engineer_placement_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in BASE_FEATURES:
        if col not in df.columns:
            df[col] = 70
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(70)

    apt = df["aptitude_score"]
    res = df["resume_score"]
    comm = df["communication_score"]
    interview = df["interview_readiness"]

    composite = (apt + res + comm + interview) / 4.0
    ratio = (comm + interview) / (apt + res + 1e-5)

    df["readiness_composite"] = composite
    df["soft_hard_ratio"] = ratio
    return df


def train_placement_model():
    print("Training Placement & Employability Models...")

    df_placement = None
    if (DATASETS_DIR / "placement.csv").exists():
        df_placement = pd.read_csv(DATASETS_DIR / "placement.csv").groupby("student_id").first().reset_index()

    if df_placement is not None and not df_placement.empty:
        df = df_placement.copy()
        if "placement_probability" not in df.columns:
            df["placement_probability"] = df["employability_score"].apply(
                lambda s: "High" if s >= 70 else ("Medium" if s >= 50 else "Low")
            )
        if "package_lpa" not in df.columns:
            df["package_lpa"] = df["employability_score"] * 0.12
    else:
        print("Placement dataset not found; generating synthetic training dataset...")
        np.random.seed(42)
        n_samples = 1000
        aptitude = np.random.randint(40, 100, n_samples)
        resume = np.random.randint(40, 100, n_samples)
        comm = np.random.randint(40, 100, n_samples)
        interview = np.random.randint(40, 100, n_samples)

        emp_score = (aptitude * 0.25) + (resume * 0.25) + (comm * 0.25) + (interview * 0.25)
        probs = ["High" if s >= 70 else ("Medium" if s >= 50 else "Low") for s in emp_score]
        packages = [round(max(3.0, s * 0.14 + np.random.normal(0, 0.5)), 2) for s in emp_score]

        df = pd.DataFrame({
            "aptitude_score": aptitude,
            "resume_score": resume,
            "communication_score": comm,
            "interview_readiness": interview,
            "employability_score": emp_score,
            "placement_probability": probs,
            "package_lpa": packages,
        })

    df = engineer_placement_features(df)

    X = df[ALL_FEATURES]
    y_cat = df["placement_probability"]
    y_score = df["employability_score"]
    y_pkg = df.get("package_lpa", y_score * 0.12)

    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X, y_cat, test_size=0.2, random_state=42, stratify=y_cat
    )

    scaler = StandardScaler()
    X_train_c_scaled = scaler.fit_transform(X_train_c)
    X_test_c_scaled = scaler.transform(X_test_c)

    # 1. Placement Probability Classifier (RandomForestClassifier, n_estimators=100, max_depth=8)
    classifier = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        class_weight="balanced",
        min_samples_split=3,
        random_state=42,
    )
    classifier.fit(X_train_c_scaled, y_train_c)

    y_pred_c = classifier.predict(X_test_c_scaled)
    acc = accuracy_score(y_test_c, y_pred_c)
    p_w, r_w, f_w, _ = precision_recall_fscore_support(y_test_c, y_pred_c, average="weighted")
    p_m, r_m, f_m, _ = precision_recall_fscore_support(y_test_c, y_pred_c, average="macro")

    print("\n--- Placement Tier Classifier Results ---")
    print(f"Accuracy: {acc:.4f} | Weighted F1: {f_w:.4f} | Macro F1: {f_m:.4f} | Macro Recall: {r_m:.4f}")
    print(classification_report(y_test_c, y_pred_c))

    # 2. Employability Scoring Regressor (RandomForestRegressor, n_estimators=100, max_depth=8)
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
        X, y_score, test_size=0.2, random_state=42
    )
    X_train_r_scaled = scaler.transform(X_train_r)
    X_test_r_scaled = scaler.transform(X_test_r)

    score_regressor = RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        min_samples_split=3,
        random_state=42,
    )
    score_regressor.fit(X_train_r_scaled, y_train_r)
    y_pred_r = score_regressor.predict(X_test_r_scaled)
    r2_score_val = r2_score(y_test_r, y_pred_r)
    rmse_val = np.sqrt(mean_squared_error(y_test_r, y_pred_r))

    print("\n--- Employability Regressor Results ---")
    print(f"R2 Score: {r2_score_val:.4f} | RMSE: {rmse_val:.4f}")

    # 3. Package Regressor
    pkg_regressor = RandomForestRegressor(
        n_estimators=100,
        max_depth=8,
        min_samples_split=3,
        random_state=42,
    )
    pkg_regressor.fit(scaler.transform(X), y_pkg)

    payload = {
        "classifier": classifier,
        "score_regressor": score_regressor,
        "pkg_regressor": pkg_regressor,
        "scaler": scaler,
        "base_features": BASE_FEATURES,
        "all_features": ALL_FEATURES,
        "classes": list(classifier.classes_),
        "metrics": {
            "accuracy": float(acc),
            "weighted_f1": float(f_w),
            "macro_f1": float(f_m),
            "r2_score": float(r2_score_val),
            "rmse": float(rmse_val),
        },
    }

    joblib.dump(payload, MODEL_PATH)
    print(f"[OK] Successfully saved Placement & Employability Models to {MODEL_PATH}")


if __name__ == "__main__":
    train_placement_model()
