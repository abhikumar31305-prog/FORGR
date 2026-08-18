from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import crud
import ml_service
from auth import build_user_response, get_db, get_current_user, login_user, refresh_user_tokens, register_user, require_role

from database import Base, engine, SessionLocal

from API import backlog, placement, employability, career, bulk_import

Base.metadata.create_all(bind=engine)

with SessionLocal() as seed_db:
    crud.seed_default_auth_users(seed_db)

app = FastAPI(title="FORGR API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(backlog.router)
app.include_router(placement.router)
app.include_router(employability.router)
app.include_router(career.router)
app.include_router(bulk_import.router)


@app.get("/")
def home():
    return {"message": "FORGR API is Running 🚀"}


@app.get("/health")
def healthcheck():
    return {"status": "healthy", "service": "FORGR API", "version": "1.0.0"}


# ── Auth ─────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=schemas.LoginResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    try:
        response = register_user(db, payload)
        crud.record_login_attempt(db, payload.email, True, payload.role, "registration")
        return response
    except ValueError as exc:
        crud.record_login_attempt(db, payload.email, False, payload.role, str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        response = login_user(db, payload)
        crud.record_login_attempt(db, payload.email, True, response.user.role, "login")
        return response
    except ValueError as exc:
        crud.record_login_attempt(db, payload.email, False, None, str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LookupError as exc:
        crud.record_login_attempt(db, payload.email, False, None, str(exc))
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/auth/refresh", response_model=schemas.LoginResponse)
def refresh(payload: schemas.RefreshRequest, db: Session = Depends(get_db)):
    try:
        return refresh_user_tokens(db, payload.refresh_token)
    except HTTPException:
        raise


@app.get("/auth/me", response_model=schemas.AuthUserResponse)
def me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_user_response(db, current_user)


# ── Students ─────────────────────────────────────────────────────────

@app.post("/students", response_model=schemas.StudentResponse)
def create_student(
    student: schemas.StudentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin")),
):
    return crud.create_student(db, student)

@app.get("/students")
def get_students(
    branch: str | None = Query(default=None),
    year: int | None = Query(default=None),
    risk: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    return crud.get_students(db, branch=branch, year=year, risk=risk)


# ── Student Profile ──────────────────────────────────────────────────

@app.get("/students/{student_id}/profile", response_model=schemas.StudentProfileResponse)
def get_student_profile(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    try:
        return crud.build_profile_response(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/profile", response_model=schemas.StudentProfileResponse)
def update_student_profile(
    student_id: str,
    payload: schemas.StudentProfileUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "admin")),
):
    try:
        crud.update_student_profile(db, student_id, payload)
        return crud.build_profile_response(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/report-card", response_model=schemas.StudentProfileResponse)
def get_student_report_card(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    try:
        return crud.build_profile_response(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ── Granular student data endpoints (GET & PUT) ──────────────────────

@app.get("/students/{student_id}/academics", response_model=list[schemas.AcademicResponse])
def get_student_academics(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    try:
        return crud.get_student_academics(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/academics", response_model=schemas.AcademicResponse)
def update_student_academics(
    student_id: str,
    payload: schemas.AcademicUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("faculty", "admin")),
):
    try:
        return crud.update_student_academics(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/attendance", response_model=list[schemas.AttendanceResponse])
def get_student_attendance(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "admin")),
):
    try:
        return crud.get_student_attendance(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/attendance", response_model=schemas.AttendanceResponse)
def update_student_attendance(
    student_id: str,
    payload: schemas.AttendanceUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("faculty", "admin")),
):
    try:
        return crud.update_student_attendance(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/skills", response_model=schemas.SkillResponse)
def get_student_skills(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    try:
        row = crud.get_student_skills(db, student_id)
        if row is None:
            return schemas.SkillResponse()
        return row
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/skills", response_model=schemas.SkillResponse)
def update_student_skills(
    student_id: str,
    payload: schemas.SkillUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "admin")),
):
    try:
        return crud.update_student_skills(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/placement", response_model=schemas.PlacementResponse)
def get_student_placement(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "recruiter", "admin")),
):
    try:
        row = crud.get_student_placement(db, student_id)
        if row is None:
            return schemas.PlacementResponse()
        return row
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/placement", response_model=schemas.PlacementResponse)
def update_student_placement(
    student_id: str,
    payload: schemas.PlacementUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("placement_cell", "admin")),
):
    try:
        return crud.update_student_placement(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/portfolio", response_model=schemas.PortfolioResponse)
def get_student_portfolio(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    try:
        row = crud.get_student_portfolio(db, student_id)
        if row is None:
            return schemas.PortfolioResponse()
        return row
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/portfolio", response_model=schemas.PortfolioResponse)
def update_student_portfolio(
    student_id: str,
    payload: schemas.PortfolioUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "admin")),
):
    try:
        return crud.update_student_portfolio(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/risk", response_model=schemas.RiskPredictionResponse)
def get_student_risk(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "admin")),
):
    try:
        row = crud.get_student_risk(db, student_id)
        if row is None:
            return schemas.RiskPredictionResponse()
        return row
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/risk", response_model=schemas.RiskPredictionResponse)
def update_student_risk(
    student_id: str,
    payload: schemas.RiskPredictionUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("faculty", "admin")),
):
    try:
        return crud.update_student_risk(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ── Dashboard aggregate endpoints ───────────────────────────────────

@app.get("/dashboard/student/{student_id}", response_model=schemas.StudentDashboardResponse)
def dashboard_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "admin")),
):
    try:
        return crud.build_student_dashboard(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/dashboard/admin", response_model=schemas.AdminDashboardResponse)
def dashboard_admin(
    branch: str | None = Query(default=None),
    year: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin")),
):
    return crud.build_admin_dashboard(db, branch=branch, year=year)


@app.get("/dashboard/parent/{student_id}", response_model=schemas.ParentDashboardResponse)
def dashboard_parent(
    student_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("parent", "admin")),
):
    try:
        return crud.build_parent_dashboard(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/dashboard/faculty", response_model=schemas.FacultyDashboardResponse)
def dashboard_faculty(
    branch: str | None = Query(default=None),
    year: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("faculty", "admin")),
):
    return crud.build_faculty_dashboard(db, branch=branch, year=year)


@app.get("/dashboard/placement", response_model=schemas.PlacementDashboardResponse)
def dashboard_placement(
    branch: str | None = Query(default=None),
    year: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("placement_cell", "admin")),
):
    return crud.build_placement_dashboard(db, branch=branch, year=year)


@app.get("/dashboard/recruiter", response_model=schemas.RecruiterDashboardResponse)
def dashboard_recruiter(
    branch: str | None = Query(default=None),
    min_cgpa: float | None = Query(default=None),
    min_employability: float | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("recruiter", "admin")),
):
    return crud.build_recruiter_dashboard(db, branch=branch, min_cgpa=min_cgpa, min_employability=min_employability)