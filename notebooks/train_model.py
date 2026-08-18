"""
FORGR Machine Learning Model Trainer

Trains Random Forest models for:
1. Student Risk Level Prediction (Low / Medium / High) + AI Prescriptive Suggestion
2. Employability Score & Placement Probability Prediction

Exports serialized models to `backend/saved_models/`.
"""

import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "datasets"
MODEL_DIR = BASE_DIR / "backend" / "saved_models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


def train_risk_model():
    print("\n[1/2] Training Student Risk Prediction Model (Random Forest Classifier)...")

    # Load datasets
    students = pd.read_csv(DATA_DIR / "students.csv")
    academics = pd.read_csv(DATA_DIR / "academics.csv")
    attendance = pd.read_csv(DATA_DIR / "attendance.csv")
    skills = pd.read_csv(DATA_DIR / "skills.csv")
    portfolio = pd.read_csv(DATA_DIR / "portfolio.csv")
    risk = pd.read_csv(DATA_DIR / "risk_prediction.csv")

    # Group by student_id to get latest metrics
    latest_ac = academics.sort_values("semester").groupby("student_id").last().reset_index()
    latest_att = attendance.sort_values("semester").groupby("student_id").last().reset_index()

    # Merge features
    df = students.merge(latest_ac[["student_id", "cgpa", "backlogs"]], on="student_id", how="left")
    df = df.merge(latest_att[["student_id", "attendance_percentage"]], on="student_id", how="left")
    df = df.merge(skills[["student_id", "coding_score", "python", "java", "sql", "communication"]], on="student_id", how="left")
    df = df.merge(portfolio[["student_id", "projects", "certifications", "github_score"]], on="student_id", how="left")
    df = df.merge(risk[["student_id", "overall_risk"]], on="student_id", how="left")

    # Fill NAs
    df["cgpa"] = df["cgpa"].fillna(7.0)
    df["backlogs"] = df["backlogs"].fillna(0)
    df["attendance_percentage"] = df["attendance_percentage"].fillna(80.0)
    df["coding_score"] = df["coding_score"].fillna(150)
    df["projects"] = df["projects"].fillna(1)
    df["overall_risk"] = df["overall_risk"].fillna("Low")

    features = ["attendance_percentage", "cgpa", "backlogs", "coding_score", "projects", "python", "communication"]
    X = df[features]
    y = df["overall_risk"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)

    print(f"  ✔ Train Accuracy: {train_acc * 100:.2f}%")
    print(f"  ✔ Test Accuracy:  {test_acc * 100:.2f}%")
    print("\nClassification Report:\n", classification_report(y_test, model.predict(X_test)))

    save_path = MODEL_DIR / "risk_model.joblib"
    joblib.dump({"model": model, "features": features}, save_path)
    print(f"  💾 Saved Risk Model to: {save_path}")


def train_placement_model():
    print("\n[2/2] Training Placement Employability & Probability Models...")

    placement = pd.read_csv(DATA_DIR / "placement.csv")

    features = ["aptitude_score", "resume_score", "communication_score", "interview_readiness"]
    X = placement[features]
    y_score = placement["employability_score"]
    y_prob = placement["placement_probability"]

    # 1. Regressor for employability score
    X_train, X_test, y_train_score, y_test_score = train_test_split(X, y_score, test_size=0.2, random_state=42)

    reg_model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    reg_model.fit(X_train, y_train_score)

    preds = reg_model.predict(X_test)
    r2 = r2_score(y_test_score, preds)
    rmse = np.sqrt(mean_squared_error(y_test_score, preds))

    print(f"  ✔ Employability Score Regressor R2: {r2:.4f}, RMSE: {rmse:.2f}")

    # 2. Classifier for placement probability
    X_train_c, X_test_c, y_train_prob, y_test_prob = train_test_split(X, y_prob, test_size=0.2, random_state=42, stratify=y_prob)

    clf_model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    clf_model.fit(X_train_c, y_train_prob)

    clf_acc = clf_model.score(X_test_c, y_test_prob)
    print(f"  ✔ Placement Probability Classifier Accuracy: {clf_acc * 100:.2f}%")

    save_path = MODEL_DIR / "placement_model.joblib"
    joblib.dump({
        "regressor": reg_model,
        "classifier": clf_model,
        "features": features
    }, save_path)
    print(f"  💾 Saved Placement Model to: {save_path}")


if __name__ == "__main__":
    print("FORGR Machine Learning Model Trainer")
    print("=" * 45)
    train_risk_model()
    train_placement_model()
    print("\n✅ All Machine Learning Models Successfully Trained & Serialized!")
