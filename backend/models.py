from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class UserRole(str, Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    PLACEMENT_CELL = "placement_cell"
    PARENT = "parent"
    RECRUITER = "recruiter"
    ADMIN = "admin"

class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    roll_no: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    email: Mapped[str] = mapped_column(String)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    department: Mapped[str] = mapped_column(String)
    year: Mapped[int] = mapped_column(Integer)
    semester: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section: Mapped[str | None] = mapped_column(String(5), nullable=True)


class Academic(Base):
    __tablename__ = "academics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    cgpa: Mapped[float] = mapped_column(Float, nullable=False)
    sgpa: Mapped[float] = mapped_column(Float, nullable=False)
    class_rank: Mapped[int] = mapped_column(Integer, nullable=True)
    backlogs: Mapped[int] = mapped_column(Integer, default=0)
    internal_avg: Mapped[float] = mapped_column(Float, nullable=True)
    external_avg: Mapped[float] = mapped_column(Float, nullable=True)


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    attendance_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    classes_attended: Mapped[int] = mapped_column(Integer, nullable=True)
    classes_conducted: Mapped[int] = mapped_column(Integer, nullable=True)
    low_attendance: Mapped[bool] = mapped_column(Boolean, default=False)


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    python: Mapped[int] = mapped_column(Integer, default=0)
    java: Mapped[int] = mapped_column(Integer, default=0)
    sql: Mapped[int] = mapped_column(Integer, default=0)
    machine_learning: Mapped[int] = mapped_column(Integer, default=0)
    data_science: Mapped[int] = mapped_column(Integer, default=0)
    communication: Mapped[int] = mapped_column(Integer, default=0)
    coding_score: Mapped[int] = mapped_column(Integer, default=0)


class Placement(Base):
    __tablename__ = "placements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    aptitude_score: Mapped[int] = mapped_column(Integer, default=0)
    resume_score: Mapped[int] = mapped_column(Integer, default=0)
    communication_score: Mapped[int] = mapped_column(Integer, default=0)
    interview_readiness: Mapped[int] = mapped_column(Integer, default=0)
    employability_score: Mapped[float] = mapped_column(Float, default=0.0)
    placement_probability: Mapped[str] = mapped_column(String(10), default="Low")
    placed: Mapped[bool] = mapped_column(Boolean, default=False)
    package_lpa: Mapped[float] = mapped_column(Float, default=0.0)


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    projects: Mapped[int] = mapped_column(Integer, default=0)
    certifications: Mapped[int] = mapped_column(Integer, default=0)
    github_repositories: Mapped[int] = mapped_column(Integer, default=0)
    github_score: Mapped[int] = mapped_column(Integer, default=0)


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    backlog_risk: Mapped[str] = mapped_column(String(10), default="Low")
    dropout_risk: Mapped[str] = mapped_column(String(10), default="Low")
    attendance_risk: Mapped[str] = mapped_column(String(10), default="Low")
    placement_risk: Mapped[str] = mapped_column(String(10), default="Low")
    overall_risk: Mapped[str] = mapped_column(String(10), default="Low")
    ai_suggestion: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ML model versioning fields
    model_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    predicted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    profile_json: Mapped[str] = mapped_column(Text, nullable=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, native_enum=False), nullable=False)
    linked_profile_id: Mapped[int | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class LoginAuditLog(Base):
    __tablename__ = "login_audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, index=True, nullable=False)
    role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    success: Mapped[bool] = mapped_column(nullable=False, default=False)
    detail: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class EditAuditLog(Base):
    __tablename__ = "edit_audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    table_name: Mapped[str] = mapped_column(String(64), nullable=False)
    student_id: Mapped[str | None] = mapped_column(String, nullable=True)
    user_email: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)  # 'create', 'update', 'delete', 'import'
    field_changed: Mapped[str | None] = mapped_column(String, nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ImportHistory(Base):
    __tablename__ = "import_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    import_batch_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    admin_email: Mapped[str] = mapped_column(String, index=True, nullable=False)
    dataset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    import_mode: Mapped[str] = mapped_column(String(32), nullable=False)  # 'create', 'update', 'upsert', 'replace'
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    inserted_rows: Mapped[int] = mapped_column(Integer, default=0)
    updated_rows: Mapped[int] = mapped_column(Integer, default=0)
    skipped_rows: Mapped[int] = mapped_column(Integer, default=0)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="Completed")  # 'Validating', 'Processing', 'Completed', 'Completed with warnings', 'Failed', 'Rolled back'
    error_log_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ── ML Model Registry ───────────────────────────────────────────────


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    model_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # 'backlog_risk', 'placement', 'employability', 'career'
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    metrics_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # {"accuracy": 0.92, "f1": 0.89, ...}
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    promoted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    promoted_by: Mapped[str | None] = mapped_column(String, nullable=True)


# ── ML Monitoring ────────────────────────────────────────────────────


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    model_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    model_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    prediction: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    input_features_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DriftReport(Base):
    __tablename__ = "drift_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    model_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    model_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    psi_score: Mapped[float] = mapped_column(Float, nullable=False)
    feature_drifts_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_drifted: Mapped[bool] = mapped_column(Boolean, default=False)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ── Compliance ───────────────────────────────────────────────────────


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    actor_email: Mapped[str] = mapped_column(String, nullable=False, index=True)
    actor_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    action_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # 'role_change', 'data_export', 'record_update', 'record_delete', 'bulk_import', 'model_promotion', 'consent_change'
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String, nullable=True)
    details_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    consent_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # 'data_processing', 'analytics', 'marketing', 'third_party_sharing'
    granted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    granted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    policy_version: Mapped[str] = mapped_column(String(16), default="1.0", nullable=False)


# ── Subscriptions & Razorpay Billing ──────────────────────────────────


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    admin_email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    plan_id: Mapped[str] = mapped_column(String(32), default="trial", nullable=False)  # 'trial', 'starter', 'growth', 'enterprise', 'custom'
    billing_cycle: Mapped[str] = mapped_column(String(16), default="monthly", nullable=False)  # 'monthly', 'yearly'
    profile_limit: Mapped[int] = mapped_column(Integer, default=100, nullable=False)  # max students managed
    status: Mapped[str] = mapped_column(String(32), default="trialing", nullable=False, index=True)  # 'trialing', 'active', 'past_due', 'expired', 'cancelled'
    trial_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    trial_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    razorpay_subscription_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    razorpay_customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    admin_email: Mapped[str] = mapped_column(String, index=True, nullable=False)
    razorpay_order_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    razorpay_signature: Mapped[str | None] = mapped_column(String(128), nullable=True)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # in paise (1 INR = 100 paise)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="created", nullable=False)  # 'created', 'captured', 'failed'
    plan_id: Mapped[str] = mapped_column(String(32), nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(16), nullable=False)
    profile_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

