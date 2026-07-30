from sqlalchemy import Boolean, Column, Float, Integer, String

try:
    from .database import Base
except ImportError:  # pragma: no cover - allows running as a script from the backend folder
    from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    department = Column(String, nullable=False)
    year = Column(Integer, nullable=False)


class Academic(Base):
    __tablename__ = "academics"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    semester = Column(Integer, nullable=False)
    cgpa = Column(Float, nullable=False)
    sgpa = Column(Float, nullable=False)
    class_rank = Column(Integer, nullable=False)
    backlogs = Column(Integer, nullable=False)
    internal_avg = Column(Float, nullable=False)
    external_avg = Column(Float, nullable=False)


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    semester = Column(Integer, nullable=False)
    attendance_percentage = Column(Float, nullable=False)
    classes_attended = Column(Integer, nullable=False)
    classes_conducted = Column(Integer, nullable=False)
    low_attendance = Column(Boolean, nullable=False)


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    python = Column(Integer, nullable=False)
    java = Column(Integer, nullable=False)
    sql = Column(Integer, nullable=False)
    machine_learning = Column(Integer, nullable=False)
    data_science = Column(Integer, nullable=False)
    communication = Column(Integer, nullable=False)
    coding_score = Column(Integer, nullable=False)


class Portfolio(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    projects = Column(Integer, nullable=False)
    certifications = Column(Integer, nullable=False)
    github_repositories = Column(Integer, nullable=False)
    github_score = Column(Integer, nullable=False)


class Placement(Base):
    __tablename__ = "placement"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    aptitude_score = Column(Integer, nullable=False)
    resume_score = Column(Integer, nullable=False)
    communication_score = Column(Integer, nullable=False)
    interview_readiness = Column(Integer, nullable=False)
    employability_score = Column(Float, nullable=False)
    placement_probability = Column(String, nullable=False)
    placed = Column(Integer, nullable=False)
    package_lpa = Column(Float, nullable=False)


class RiskPrediction(Base):
    __tablename__ = "risk_prediction"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True, nullable=False)
    backlog_risk = Column(String, nullable=False)
    attendance_risk = Column(String, nullable=False)
    placement_risk = Column(String, nullable=False)
    overall_risk = Column(String, nullable=False)
    ai_suggestion = Column(String, nullable=False)