"""
Student Risk Prediction Model Training Script

Trains a RandomForestClassifier with n_estimators=100 and max_depth=8
to predict Student Risk Category (Low / Medium / High) based on 7 input features:
- attendance_percentage
- cgpa
- backlogs
- coding_score
- projects
- python
- communication

Includes domain feature engineering and class balancing to maximize
Accuracy, Precision, Recall, and F1 Score.
Saves trained payload to `backend/ml/backlog/backlog_model.pkl`.
"""

import sys
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report

BASE_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BASE_DIR.parent.parent.parent / "datasets"
MODEL_PATH = BASE_DIR / "backlog_model.pkl"

BASE_FEATURES = [
    "attendance_percentage",
    "cgpa",
    "backlogs",
    "coding_score",
    "projects",
    "python",
    "communication",
]

ENGINEERED_FEATURES = [
    "tech_composite",
    "academic_health",
    "overall_readiness_index",
]

ALL_FEATURES = BASE_FEATURES + ENGINEERED_FEATURES


def engineer_risk_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in BASE_FEATURES:
        if col not in df.columns:
            if col == "attendance_percentage":
                df[col] = 85.0
            elif col == "cgpa":
                df[col] = 7.5
            elif col == "backlogs":
                df[col] = 0
            elif col == "coding_score":
                df[col] = 150
            elif col == "projects":
                df[col] = 1
            elif col in ["python", "communication"]:
                df[col] = 70
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(df[col].median() if not df[col].dropna().empty else 0)

    # Domain Feature Engineering
    tech_comp = (df["coding_score"] / 300.0 * 50.0) + (df["python"] / 100.0 * 50.0)
    academic_h = (df["cgpa"] * 10.0) - (df["backlogs"] * 15.0)
    readiness_idx = (
        (df["attendance_percentage"] * 0.3)
        + (df["cgpa"] * 5.0)
        + (tech_comp * 0.2)
        - (df["backlogs"] * 10.0)
    )

    df["tech_composite"] = tech_comp
    df["academic_health"] = academic_h
    df["overall_readiness_index"] = readiness_idx
    return df


def train_backlog_model():
    print("Training Student Risk Prediction Model (RandomForestClassifier)...")

    df_academics = None
    df_attendance = None
    df_skills = None
    df_portfolio = None
    df_risk = None

    if (DATASETS_DIR / "academics.csv").exists():
        df_academics = pd.read_csv(DATASETS_DIR / "academics.csv").groupby("student_id").first().reset_index()
    if (DATASETS_DIR / "attendance.csv").exists():
        df_attendance = pd.read_csv(DATASETS_DIR / "attendance.csv").groupby("student_id").first().reset_index()
    if (DATASETS_DIR / "skills.csv").exists():
        df_skills = pd.read_csv(DATASETS_DIR / "skills.csv").groupby("student_id").first().reset_index()
    if (DATASETS_DIR / "portfolio.csv").exists():
        df_portfolio = pd.read_csv(DATASETS_DIR / "portfolio.csv").groupby("student_id").first().reset_index()
    if (DATASETS_DIR / "risk_prediction.csv").exists():
        df_risk = pd.read_csv(DATASETS_DIR / "risk_prediction.csv").groupby("student_id").first().reset_index()

    if df_academics is not None and df_attendance is not None:
        df = df_academics.merge(df_attendance[["student_id", "attendance_percentage"]], on="student_id", how="left")
        if df_skills is not None:
            df = df.merge(df_skills[["student_id", "coding_score", "python", "communication"]], on="student_id", how="left")
        if df_portfolio is not None:
            df = df.merge(df_portfolio[["student_id", "projects"]], on="student_id", how="left")

        if df_risk is not None:
            df = df.merge(df_risk[["student_id", "overall_risk", "backlog_risk"]], on="student_id", how="left")
            df["target_risk"] = df["overall_risk"].fillna(df["backlog_risk"]).fillna("Low")
        else:
            def label_risk(row):
                if row.get("backlogs", 0) >= 2 or row.get("attendance_percentage", 100) < 70 or row.get("cgpa", 10) < 5.5:
                    return "High"
                elif row.get("backlogs", 0) == 1 or row.get("attendance_percentage", 100) < 80 or row.get("cgpa", 10) < 6.8:
                    return "Medium"
                return "Low"
            df["target_risk"] = df.apply(label_risk, axis=1)
    else:
        print("Datasets not found; generating synthetic training samples...")
        np.random.seed(42)
        n_samples = 1000
        cgpa = np.random.uniform(4.0, 10.0, n_samples)
        attendance = np.random.uniform(50.0, 100.0, n_samples)
        backlogs = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.7, 0.15, 0.08, 0.04, 0.03])
        coding = np.random.randint(50, 300, n_samples)
        projects = np.random.randint(0, 5, n_samples)
        python = np.random.randint(30, 100, n_samples)
        communication = np.random.randint(30, 100, n_samples)

        targets = []
        for i in range(n_samples):
            if backlogs[i] >= 2 or attendance[i] < 70 or cgpa[i] < 5.5:
                targets.append("High")
            elif backlogs[i] == 1 or attendance[i] < 80 or cgpa[i] < 6.8:
                targets.append("Medium")
            else:
                targets.append("Low")

        df = pd.DataFrame({
            "attendance_percentage": attendance,
            "cgpa": cgpa,
            "backlogs": backlogs,
            "coding_score": coding,
            "projects": projects,
            "python": python,
            "communication": communication,
            "target_risk": targets,
        })

    df = engineer_risk_features(df)

    X = df[ALL_FEATURES]
    y = df["target_risk"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # RandomForestClassifier with parameters matching architecture (n_estimators=100, max_depth=8)
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        class_weight="balanced_subsample",
        min_samples_split=3,
        random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    p_w, r_w, f_w, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")
    p_m, r_m, f_m, _ = precision_recall_fscore_support(y_test, y_pred, average="macro")

    print("\n--- Model Evaluation Results ---")
    print(f"Accuracy: {acc:.4f}")
    print(f"Weighted Precision: {p_w:.4f} | Recall: {r_w:.4f} | F1: {f_w:.4f}")
    print(f"Macro Precision:    {p_m:.4f} | Recall: {r_m:.4f} | F1: {f_m:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    importances = dict(zip(ALL_FEATURES, model.feature_importances_))

    payload = {
        "model": model,
        "scaler": scaler,
        "base_features": BASE_FEATURES,
        "all_features": ALL_FEATURES,
        "classes": list(model.classes_),
        "feature_importances": importances,
        "metrics": {
            "accuracy": float(acc),
            "weighted_f1": float(f_w),
            "macro_f1": float(f_m),
            "macro_recall": float(r_m),
        },
    }

    joblib.dump(payload, MODEL_PATH)
    print(f"[OK] Successfully saved Student Risk Prediction Model to {MODEL_PATH}")


if __name__ == "__main__":
    train_backlog_model()
