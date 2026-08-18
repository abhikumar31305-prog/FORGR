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
    action: Mapped[str] = mapped_column(String(16), nullable=False)  # 'create', 'update', 'delete'
    field_changed: Mapped[str | None] = mapped_column(String, nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)