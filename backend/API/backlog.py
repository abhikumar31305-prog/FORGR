"""
Student Risk Prediction API Router
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional

import crud
import models
from auth import get_db, require_role
from ml.backlog.predict import predict_backlog_risk

router = APIRouter(prefix="/api/backlog", tags=["Student Risk Prediction"])


class BacklogPredictionRequest(BaseModel):
    attendance_percentage: float = Field(default=85.0, ge=0.0, le=100.0)
    cgpa: float = Field(default=7.5, ge=0.0, le=10.0)
    backlogs: int = Field(default=0, ge=0)
    coding_score: int = Field(default=150, ge=0)
    projects: int = Field(default=1, ge=0)
    python: int = Field(default=70, ge=0, le=100)
    communication: int = Field(default=70, ge=0, le=100)


@router.post("/predict")
def predict_backlog(payload: BacklogPredictionRequest):
    """
    Predict student risk category (Low / Medium / High), confidence probabilities,
    and customized interventions.
    """
    return predict_backlog_risk(
        attendance_percentage=payload.attendance_percentage,
        cgpa=payload.cgpa,
        backlogs=payload.backlogs,
        coding_score=payload.coding_score,
        projects=payload.projects,
        python=payload.python,
        communication=payload.communication,
    )


@router.get("/student/{student_id}")
def get_student_backlog_risk(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "admin")),
):
    """
    Fetch student database metrics across academics, attendance, skills, and portfolio,
    and predict Student Risk Category.
    """
    try:
        academics = crud.get_student_academics(db, student_id)
        attendance_rows = crud.get_student_attendance(db, student_id)
        skills_row = crud.get_student_skills(db, student_id)
        portfolio_row = crud.get_student_portfolio(db, student_id)

        latest_cgpa = academics[-1].cgpa if academics else 7.5
        latest_backlogs = academics[-1].backlogs if academics else 0
        latest_attendance = attendance_rows[-1].attendance_percentage if attendance_rows else 85.0

        coding_score = skills_row.coding_score if skills_row else 150
        python_skill = skills_row.python if skills_row else 70
        comm_skill = skills_row.communication if skills_row else 70
        projects_count = portfolio_row.projects if portfolio_row else 1

        res = predict_backlog_risk(
            attendance_percentage=latest_attendance,
            cgpa=latest_cgpa,
            backlogs=latest_backlogs,
            coding_score=coding_score,
            projects=projects_count,
            python=python_skill,
            communication=comm_skill,
        )
        student_obj = crud.get_student_by_identifier(db, student_id)
        res["student_id"] = student_id
        res["student_name"] = student_obj.name if student_obj else f"Student_{student_id}"
        return res
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


class GuidanceRequest(BaseModel):
    student_id: Optional[str] = "1001"
    focus_area: str = Field(default="all", description="all, attendance, dsa, backlog, placement")
    custom_goal: Optional[str] = None


@router.post("/guidance")
def generate_ai_guidance(
    payload: GuidanceRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "admin")),
):
    """
    Generate on-demand, targeted prescriptive AI guidance roadmap based on student's current ML risk factors.
    """
    sid = str(payload.student_id or "1001").strip()
    try:
        student = db.query(models.Student).filter(
            (models.Student.student_id == sid) |
            (models.Student.email.ilike(sid)) |
            (models.Student.roll_no.ilike(sid))
        ).first()

        target_sid = student.student_id if student else sid
        target_name = student.name if student else f"Student_{target_sid}"

        academics = db.query(models.Academic).filter(models.Academic.student_id == target_sid).order_by(models.Academic.semester).all()
        attendance = db.query(models.Attendance).filter(models.Attendance.student_id == target_sid).order_by(models.Attendance.semester).all()
        skills = db.query(models.Skill).filter(models.Skill.student_id == target_sid).first()
        placement = db.query(models.Placement).filter(models.Placement.student_id == target_sid).first()
        risk = db.query(models.RiskPrediction).filter(models.RiskPrediction.student_id == target_sid).first()

        cgpa = academics[-1].cgpa if academics else 7.0
        backlogs = academics[-1].backlogs if academics else 0
        att_pct = attendance[-1].attendance_percentage if attendance else 80.0
        coding = skills.coding_score if skills else 150
        prob = placement.placement_probability if placement else "Medium"
        emp_score = placement.employability_score if placement else 55.0
        overall = risk.overall_risk if risk else "Medium"

        focus = payload.focus_area.lower()

        # Build tailored 4-week recovery roadmap
        weeks = []
        if focus in ("attendance", "all") and att_pct < 75.0:
            needed_classes = max(4, int((75.0 * 100 - att_pct * 100) / 25))
            weeks.append({
                "week": "Week 1: Immediate Attendance Recovery",
                "title": f"Attend Next {needed_classes} Lectures Without Absence",
                "tasks": [
                    f"Prioritize mandatory lecture slots in subjects with < 75% attendance (Current: {att_pct:.1f}%).",
                    "Submit medical / institutional OD certificates to Faculty Proctor to update records.",
                    "Verify daily biometric entry before 09:30 AM."
                ],
                "target_metric": f"Boost attendance from {att_pct:.1f}% ➡️ 76.5%",
                "status": "High Priority"
            })
        else:
            weeks.append({
                "week": "Week 1: Diagnostic Assessment & Foundation",
                "title": "Establish Baseline Metrics & Schedule Proctor Check-in",
                "tasks": [
                    "Complete platform technical diagnostic exam to benchmark strengths and weaknesses.",
                    "Review past semester exam answer keys with department mentor.",
                    "Set up daily 45-minute practice block on LeetCode / HackerRank."
                ],
                "target_metric": f"Maintain CGPA > {cgpa:.2f}",
                "status": "In Progress"
            })

        if focus in ("dsa", "all") or coding < 200:
            weeks.append({
                "week": "Week 2: Data Structures & Algorithmic Problem Solving",
                "title": "Master Core Patterns (Two Pointers, HashMaps, Trees)",
                "tasks": [
                    "Solve 15 Easy + 5 Medium LeetCode problems (Array, String, HashMap).",
                    "Participate in weekly Saturday college coding contest.",
                    "Push documented solutions to linked GitHub repository."
                ],
                "target_metric": f"Coding Score: {coding} ➡️ {coding + 35} pts",
                "status": "Pending"
            })

        if (focus in ("backlog", "all") and backlogs > 0) or backlogs > 0:
            weeks.append({
                "week": "Week 3: Backlog Subject Remedial Sprint",
                "title": f"Clear {backlogs} Pending Backlog Subject(s)",
                "tasks": [
                    "Attend 3 faculty remedial lectures scheduled for backlog topics.",
                    "Complete 5 previous year question papers under timed 2-hour exam conditions.",
                    "Submit assignment problem sets for faculty sign-off."
                ],
                "target_metric": f"Clear {backlogs} backlog(s) before next exam window",
                "status": "Critical"
            })
        else:
            weeks.append({
                "week": "Week 3: Real-World Portfolio Project Sprint",
                "title": "Build & Deploy 1 Full-Stack / ML Proof Project",
                "tasks": [
                    "Develop a full-stack CRUD application with RESTful API and authentication.",
                    "Deploy on Vercel / Render with live working demo link.",
                    "Add comprehensive README.md with system architecture diagram."
                ],
                "target_metric": "Portfolio Score: +15 pts",
                "status": "Pending"
            })

        weeks.append({
            "week": "Week 4: Mock Interviews & Corporate Readiness",
            "title": "Aptitude Speed Test & ATS Resume Optimization",
            "tasks": [
                "Run resume through FORGR ATS Scanner (Target ATS Score: > 85%).",
                "Complete 2 peer-to-peer technical mock interviews (System Design & Behavioral).",
                "Review company-specific placement eligibility criteria with Placement Cell."
            ],
            "target_metric": f"Employability Score: {emp_score:.1f}% ➡️ {min(100.0, emp_score + 18.5):.1f}%",
            "status": "Upcoming"
        })

        return {
            "student_id": sid,
            "student_name": student.name if student else f"Student_{sid}",
            "overall_risk": overall,
            "focus_area": payload.focus_area,
            "roadmap": weeks,
            "estimated_risk_reduction": "High ➡️ Low" if overall == "High" else "Medium ➡️ Low",
            "confidence_score": 0.94,
            "summary_recommendation": f"Following this 4-week structured plan is projected to increase employability score by ~18% and transition overall risk from {overall} to Low."
        }
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


class RiskSimulationRequest(BaseModel):
    attendance_percentage: float = Field(default=85.0, ge=0.0, le=100.0)
    cgpa: float = Field(default=7.5, ge=0.0, le=10.0)
    backlogs: int = Field(default=0, ge=0)
    coding_score: int = Field(default=150, ge=0)
    projects: int = Field(default=1, ge=0)
    python: int = Field(default=70, ge=0, le=100)
    communication: int = Field(default=70, ge=0, le=100)


@router.post("/simulate")
def simulate_risk_outcome(payload: RiskSimulationRequest):
    """
    Simulate what-if changes in real-time and predict the projected risk level & readiness score.
    """
    prediction = predict_backlog_risk(
        attendance_percentage=payload.attendance_percentage,
        cgpa=payload.cgpa,
        backlogs=payload.backlogs,
        coding_score=payload.coding_score,
        projects=payload.projects,
        python=payload.python,
        communication=payload.communication,
    )
    
    # Calculate simulated employability index
    emp_sim = round(
        (payload.coding_score / 300.0 * 30.0) +
        (payload.cgpa / 10.0 * 25.0) +
        (payload.communication / 100.0 * 25.0) +
        (min(payload.projects, 3) / 3.0 * 20.0) -
        (payload.backlogs * 10.0),
        1
    )
    emp_sim = max(0.0, min(100.0, emp_sim))
    
    return {
        "projected_risk": prediction["backlog_risk"],
        "probabilities": prediction["probabilities"],
        "projected_employability_score": emp_sim,
        "projected_placement_probability": "High" if emp_sim >= 70.0 else "Medium" if emp_sim >= 50.0 else "Low",
        "interventions": prediction["customized_interventions"],
        "debarment_risk": "None" if payload.attendance_percentage >= 75.0 else "Critical (<75%)"
    }
