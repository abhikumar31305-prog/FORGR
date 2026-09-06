import os
import time
import logging
import json
from collections import defaultdict, deque
from fastapi import FastAPI, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

import models
import schemas
import crud
import ml_service
from notifications import send_notification
from auth import (
    build_user_response,
    check_student_access,
    get_db,
    get_current_user,
    login_user,
    refresh_user_tokens,
    register_user,
    require_role,
)
from security import ENFORCE_HTTPS

from database import Base, engine, SessionLocal
from pathlib import Path
from uuid import uuid4

from API import backlog, placement, employability, career, bulk_import, billing
from routers import model_registry, ml_monitoring
from routers.consent import router as consent_router
from observability import RequestContextMiddleware, setup_sentry, setup_metrics, get_uptime_seconds

# ════════════════════════════════════════════════════════════════
# LOGGING CONFIGURATION
# ════════════════════════════════════════════════════════════════
ENV = os.getenv("FORGR_ENV", "development").lower()
LOG_LEVEL = os.getenv("FORGR_LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("FORGR_LOG_FORMAT", "json").lower()

# Configure logging format
log_formatter = None
if LOG_FORMAT == "json":
    class JSONFormatter(logging.Formatter):
        def format(self, record):
            log_obj = {
                "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
            if record.exc_info:
                log_obj["exception"] = self.formatException(record.exc_info)
            # Add extra fields
            for key, value in getattr(record, '__dict__', {}).items():
                if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName', 
                              'levelname', 'levelno', 'lineno', 'module', 'msecs', 'message',
                              'pathname', 'process', 'processName', 'relativeCreated', 'thread',
                              'threadName', 'exc_info', 'exc_text', 'stack_info']:
                    log_obj[key] = value
            return json.dumps(log_obj)
    log_formatter = JSONFormatter()
else:
    log_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

# Configure root logger
root_logger = logging.getLogger()
root_logger.setLevel(getattr(logging, LOG_LEVEL))
handler = logging.StreamHandler()
handler.setFormatter(log_formatter)
root_logger.addHandler(handler)

logger = logging.getLogger("forgr.api")
logger.info(f"FORGR API starting in {ENV} environment", extra={"env": ENV})

# ════════════════════════════════════════════════════════════════
# DATABASE INITIALIZATION
# ════════════════════════════════════════════════════════════════
Base.metadata.create_all(bind=engine)

def _ensure_schema_compatibility(db_engine):
    """Ensure database schema includes newly introduced columns across migrations."""
    from sqlalchemy import inspect, text
    inspector = inspect(db_engine)
    if "risk_predictions" in inspector.get_table_names():
        existing_cols = {c["name"] for c in inspector.get_columns("risk_predictions")}
        cols_to_add = [
            ("model_version", "VARCHAR(32) DEFAULT 'v1.0.0'"),
            ("model_name", "VARCHAR(64) DEFAULT 'ensemble_risk_predictor'"),
            ("confidence", "FLOAT DEFAULT 0.85"),
            ("predicted_at", "DATETIME"),
        ]
        with db_engine.begin() as conn:
            for col_name, col_type in cols_to_add:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE risk_predictions ADD COLUMN {col_name} {col_type}"))
                    logger.info(f"Added column {col_name} to risk_predictions table")

_ensure_schema_compatibility(engine)

with SessionLocal() as seed_db:
    crud.seed_default_auth_users(seed_db)

app = FastAPI(
    title="FORGR API",
    description="FORGR - Student Success and Placement Platform",
    version="1.0.0",
)

# ── Observability setup ──────────────────────────────────────────────
setup_sentry(app)
setup_metrics(app)
app.add_middleware(RequestContextMiddleware)

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads" / "resumes"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ════════════════════════════════════════════════════════════════
# MIDDLEWARE CONFIGURATION
# ════════════════════════════════════════════════════════════════

# Trusted Host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[h.strip() for h in os.getenv("FORGR_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if h.strip()]
)

# CORS middleware
cors_origins = [origin.strip() for origin in os.getenv("FORGR_CORS_ORIGINS", "http://127.0.0.1:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# HTTPS enforcement middleware
@app.middleware("http")
async def enforce_https(request: Request, call_next):
    if ENFORCE_HTTPS and request.url.scheme != "https":
        # Check for X-Forwarded-Proto header (for reverse proxies)
        if request.headers.get("x-forwarded-proto") != "https":
            return JSONResponse(
                status_code=426,
                content={"detail": "HTTPS is required. Use HTTPS to access this API."},
            )
    return await call_next(request)

MAX_REQUEST_BYTES = int(os.getenv("FORGR_MAX_REQUEST_BYTES", str(20 * 1024 * 1024)))
RATE_LIMIT_PER_MINUTE = int(os.getenv("FORGR_RATE_LIMIT_PER_MINUTE", "120"))
request_windows: dict[str, deque[float]] = defaultdict(deque)
redis_client = None
if os.getenv("FORGR_REDIS_URL"):
    try:
        import redis
        redis_client = redis.Redis.from_url(os.environ["FORGR_REDIS_URL"], decode_responses=True)
        redis_client.ping()
        logger.info("Redis connection established for caching and rate limiting")
    except Exception as exc:
        logger.error(f"Failed to connect to Redis: {exc}")
        if ENV == "production":
            raise RuntimeError("FORGR_REDIS_URL is configured but Redis is unavailable.")
        redis_client = None
elif ENV == "production":
    raise RuntimeError("FORGR_REDIS_URL must be configured in production.")


@app.middleware("http")
async def enforce_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_BYTES:
        logger.warning(
            "Request size exceeded",
            extra={
                "path": request.url.path,
                "size": int(content_length),
                "limit": MAX_REQUEST_BYTES
            }
        )
        return JSONResponse(status_code=413, content={"detail": "Request payload is too large."})

    if request.url.path != "/health":
        client_key = request.client.host if request.client else "unknown"
        if client_key == "testclient" and ENV != "production":
            return await call_next(request)
        if redis_client is not None:
            bucket = f"forgr:rate:{client_key}:{int(time.time() // 60)}"
            count = redis_client.incr(bucket)
            redis_client.expire(bucket, 120)
            if count > RATE_LIMIT_PER_MINUTE:
                logger.warning(
                    "Rate limit exceeded",
                    extra={
                        "client": client_key,
                        "count": count,
                        "limit": RATE_LIMIT_PER_MINUTE
                    }
                )
                return JSONResponse(status_code=429, content={"detail": "Too many requests. Please try again later."})
        else:
            now = time.monotonic()
            window = request_windows[client_key]
            while window and now - window[0] >= 60:
                window.popleft()
            if len(window) >= RATE_LIMIT_PER_MINUTE:
                logger.warning(
                    "Rate limit exceeded (in-memory)",
                    extra={
                        "client": client_key,
                        "count": len(window),
                        "limit": RATE_LIMIT_PER_MINUTE
                    }
                )
                return JSONResponse(status_code=429, content={"detail": "Too many requests. Please try again later."})
            window.append(now)

    return await call_next(request)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = uuid4().hex
    logger.exception("Unhandled request error", extra={"request_id": request_id, "path": request.url.path, "method": request.method})
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error.", "request_id": request_id},
    )


app.include_router(backlog.router)
app.include_router(placement.router)
app.include_router(employability.router)
app.include_router(career.router)
app.include_router(bulk_import.router)
app.include_router(model_registry.router)
app.include_router(ml_monitoring.router)
app.include_router(consent_router)
app.include_router(billing.router)


@app.post("/students/{student_id}/resume")
async def upload_student_resume(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "admin")),
):
    check_student_access(current_user, student_id, db)
    extension = Path(file.filename or "").suffix.lower()
    if extension not in {".pdf", ".doc", ".docx"}:
        raise HTTPException(status_code=400, detail="Resume must be a PDF, DOC, or DOCX file.")

    stored_name = f"{student_id}_{uuid4().hex}{extension}"
    stored_path = UPLOADS_DIR / stored_name
    size = 0
    try:
        with stored_path.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > 10 * 1024 * 1024:
                    stored_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=400, detail="Resume file must be smaller than 10MB.")
                output.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Unable to store resume file.") from exc

    public_url = f"/students/{student_id}/resume/{stored_name}"
    try:
        crud.update_student_profile(db, student_id, schemas.StudentProfileUpdate(resume_link=public_url))
        return {"resume_link": public_url, "file_name": file.filename, "size": size}
    except LookupError as exc:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/resume/{file_name}")
def download_student_resume(
    student_id: str,
    file_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "admin")),
):
    check_student_access(current_user, student_id, db)
    if Path(file_name).name != file_name or not file_name.startswith(f"{student_id}_"):
        raise HTTPException(status_code=400, detail="Invalid resume file name.")
    resume_path = UPLOADS_DIR / file_name
    if not resume_path.is_file():
        raise HTTPException(status_code=404, detail="Resume file not found.")
    crud.record_edit_action(db, "student_profiles", student_id, current_user.email, "resume_download")
    db.commit()
    return FileResponse(resume_path, filename=file_name)


@app.get("/")
def home():
    return {"message": "FORGR API is Running 🚀"}


@app.get("/health")
def healthcheck():
    checks = {"database": "ok", "storage": "ok", "ml": "ok", "redis": "ok"}
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        checks["database"] = "unavailable"
    if not UPLOADS_DIR.exists() or not os.access(UPLOADS_DIR, os.W_OK):
        checks["storage"] = "unavailable"
    # ML model availability
    try:
        from pathlib import Path as _P
        ml_models = {
            "backlog_risk": _P(__file__).resolve().parent / "ml" / "backlog" / "backlog_model.pkl",
            "placement": _P(__file__).resolve().parent / "ml" / "placement" / "placement_model.pkl",
        }
        ml_details = {}
        for mtype, mpath in ml_models.items():
            ml_details[mtype] = "loaded" if mpath.exists() else "missing"
        if any(v == "missing" for v in ml_details.values()):
            checks["ml"] = "degraded"
        else:
            checks["ml"] = "ok"
    except Exception:
        checks["ml"] = "unavailable"
    # Redis connectivity
    if redis_client is not None:
        try:
            redis_client.ping()
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "unavailable"
    else:
        checks["redis"] = "not_configured"
    status_value = "healthy" if all(v in ("ok", "not_configured") for v in checks.values()) else "degraded"
    return {
        "status": status_value,
        "service": "FORGR API",
        "version": os.getenv("FORGR_VERSION", "1.0.0"),
        "environment": ENV,
        "uptime_seconds": get_uptime_seconds(),
        "checks": checks,
    }


# ── Auth ─────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=schemas.LoginResponse)
def register(
    payload: schemas.RegisterRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin")),
):
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


@app.post("/auth/password-reset/request", status_code=202)
def request_password_reset(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if user is not None:
        token = crud.create_auth_token(db, user, "password_reset", hours=1)
        send_notification(user.email, "FORGR password reset", f"Use this password reset token: {token}")
        crud.record_edit_action(db, "auth_tokens", None, user.email, "password_reset_requested")
        db.commit()
    return {"message": "If an account exists for that email, password reset instructions will be sent."}


@app.post("/auth/password-reset/confirm")
def confirm_password_reset(payload: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    try:
        user = crud.consume_auth_token(db, payload.token, "password_reset")
        user.password_hash = crud.hash_password(payload.password)
        crud.record_edit_action(db, "users", None, user.email, "password_reset")
        db.commit()
        return {"message": "Password updated. You can sign in with the new password."}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/email-verification/request", status_code=202)
def request_email_verification(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = crud.create_auth_token(db, current_user, "email_verification", hours=24)
    send_notification(current_user.email, "Verify your FORGR email", f"Use this email verification token: {token}")
    crud.record_edit_action(db, "auth_tokens", None, current_user.email, "email_verification_requested")
    db.commit()
    return {"message": "Verification instructions have been queued."}


@app.post("/auth/email-verification/confirm")
def confirm_email_verification(payload: schemas.EmailVerificationConfirm, db: Session = Depends(get_db)):
    try:
        user = crud.consume_auth_token(db, payload.token, "email_verification")
        crud.mark_email_verified(db, user)
        crud.record_edit_action(db, "users", None, user.email, "email_verified")
        db.commit()
        return {"message": "Email verification completed."}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/auth/account")
def delete_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.AuthToken).filter(models.AuthToken.user_id == current_user.id).delete()
    db.query(models.EmailVerification).filter(models.EmailVerification.user_id == current_user.id).delete()
    if current_user.linked_profile_id:
        student = db.query(models.Student).filter(models.Student.id == current_user.linked_profile_id).first()
        if student is not None:
            for model in (models.RiskPrediction, models.Placement, models.Portfolio, models.Skill, models.Attendance, models.Academic, models.StudentProfile):
                db.query(model).filter(model.student_id == student.student_id).delete()
            db.delete(student)
    crud.record_edit_action(db, "users", None, current_user.email, "account_deleted")
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted."}


@app.get("/auth/account/export")
def export_account_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = None
    if current_user.linked_profile_id:
        student = db.query(models.Student).filter(models.Student.id == current_user.linked_profile_id).first()
    export = {
        "account": {"email": current_user.email, "role": current_user.role.value if hasattr(current_user.role, "value") else current_user.role},
        "student": {"student_id": student.student_id, "name": student.name, "department": student.department, "year": student.year} if student else None,
    }
    if student:
        export["academics"] = [
            {column.name: getattr(row, column.name) for column in models.Academic.__table__.columns}
            for row in db.query(models.Academic).filter(models.Academic.student_id == student.student_id).all()
        ]
        export["attendance"] = [
            {column.name: getattr(row, column.name) for column in models.Attendance.__table__.columns}
            for row in db.query(models.Attendance).filter(models.Attendance.student_id == student.student_id).all()
        ]
    crud.record_edit_action(db, "users", None, current_user.email, "account_exported")
    db.commit()
    return export


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
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    return crud.get_students(db, branch=branch, year=year, risk=risk, offset=offset, limit=limit)


# ── Student Profile ──────────────────────────────────────────────────

@app.get("/students/{student_id}/profile", response_model=schemas.StudentProfileResponse)
def get_student_profile(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.build_profile_response(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/profile", response_model=schemas.StudentProfileResponse)
def update_student_profile(
    student_id: str,
    payload: schemas.StudentProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        crud.update_student_profile(db, student_id, payload)
        return crud.build_profile_response(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/report-card", response_model=schemas.StudentProfileResponse)
def get_student_report_card(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.build_profile_response(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ── Granular student data endpoints (GET & PUT) ──────────────────────

@app.get("/students/{student_id}/academics", response_model=list[schemas.AcademicResponse])
def get_student_academics(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.get_student_academics(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/academics", response_model=schemas.AcademicResponse)
def update_student_academics(
    student_id: str,
    payload: schemas.AcademicUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("faculty", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.update_student_academics(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/attendance", response_model=list[schemas.AttendanceResponse])
def get_student_attendance(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.get_student_attendance(db, student_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.put("/students/{student_id}/attendance", response_model=schemas.AttendanceResponse)
def update_student_attendance(
    student_id: str,
    payload: schemas.AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("faculty", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.update_student_attendance(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/skills", response_model=schemas.SkillResponse)
def get_student_skills(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    check_student_access(current_user, student_id, db)
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
    current_user: models.User = Depends(require_role("student", "faculty", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.update_student_skills(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/placement", response_model=schemas.PlacementResponse)
def get_student_placement(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "recruiter", "admin")),
):
    check_student_access(current_user, student_id, db)
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
    current_user: models.User = Depends(require_role("placement_cell", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.update_student_placement(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/portfolio", response_model=schemas.PortfolioResponse)
def get_student_portfolio(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "recruiter", "admin")),
):
    check_student_access(current_user, student_id, db)
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
    current_user: models.User = Depends(require_role("student", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.update_student_portfolio(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/students/{student_id}/risk", response_model=schemas.RiskPredictionResponse)
def get_student_risk(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "faculty", "placement_cell", "parent", "admin")),
):
    check_student_access(current_user, student_id, db)
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
    current_user: models.User = Depends(require_role("faculty", "admin")),
):
    check_student_access(current_user, student_id, db)
    try:
        return crud.update_student_risk(db, student_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ── Dashboard aggregate endpoints ───────────────────────────────────

@app.get("/dashboard/student/{student_id}", response_model=schemas.StudentDashboardResponse)
def dashboard_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "admin")),
):
    check_student_access(current_user, student_id, db)
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
    current_user: models.User = Depends(require_role("parent", "admin")),
):
    check_student_access(current_user, student_id, db)
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

# ── Admin Audit Logs & Import History Endpoints ──────────────────────

@app.get("/api/admin/audit-logs", response_model=list[schemas.AuditLogItem])
def get_admin_audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    action: str | None = Query(default=None),
    table_name: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin")),
):
    """[ADMIN ONLY] Retrieve system mutation audit trail."""
    return crud.get_audit_logs(db, limit=limit, offset=offset, action=action, table_name=table_name, search=search)


@app.get("/api/admin/import-history", response_model=list[schemas.ImportHistoryItem])
def get_admin_import_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin")),
):
    """[ADMIN ONLY] Retrieve institutional bulk import history batches."""
    return crud.get_import_history(db, limit=limit, offset=offset)


@app.post(
    "/admin/students",
    response_model=schemas.AdminStudentCreateResponse,
    status_code=201,
)
def admin_create_student(
    payload: schemas.AdminStudentCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("admin")),
):
    try:
        student, temporary_password = crud.create_admin_student(
            db, payload
        )

        return schemas.AdminStudentCreateResponse(
            student=student,
            temporary_password=temporary_password,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
