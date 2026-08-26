from datetime import datetime
from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional


# ── Common Types ─────────────────────────────────────────────────────

Role = Literal[
    "student",
    "faculty",
    "placement_cell",
    "parent",
    "recruiter",
    "admin",
]

RiskLevel = Literal["Low", "Medium", "High"]


# ── Student ──────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    student_id: str
    name: str
    email: str
    department: str
    year: int


class AdminStudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    department: str = Field(min_length=2, max_length=100)
    year: int = Field(ge=1, le=5)


class StudentResponse(BaseModel):
    id: int
    student_id: str
    roll_no: Optional[str] = None
    name: str
    gender: Optional[str] = None
    email: str
    phone: Optional[str] = None
    department: str
    year: int
    semester: Optional[int] = None
    section: Optional[str] = None

    class Config:
        from_attributes = True


class AdminStudentCreateResponse(BaseModel):
    student: StudentResponse
    temporary_password: str


# ── Auth ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Role
    linked_profile_id: Optional[int] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthUserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Role
    linked_profile_id: Optional[int] = None
    student_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


# ── Profile ──────────────────────────────────────────────────────────

class SkillProgress(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)


class StudentProfileUpdate(BaseModel):
    attendance_percent: Optional[int] = Field(
        default=None,
        ge=0,
        le=100
    )
    marks: Optional[Dict[str, int]] = None
    skills: Optional[List[SkillProgress]] = None
    resume_summary: Optional[str] = None
    resume_link: Optional[str] = None
    leetcode_progress: Optional[str] = None
    leetcode_solved: Optional[int] = Field(default=None, ge=0)
    leetcode_rating: Optional[int] = Field(default=None, ge=0)
    project_highlights: Optional[List[str]] = None
    mentor_notes: Optional[List[str]] = None
    parent_notes: Optional[List[str]] = None
    cgpa: Optional[float] = Field(default=None, ge=0)
    backlogs: Optional[int] = Field(default=None, ge=0)
    overall_risk: Optional[RiskLevel] = None
    placement_probability: Optional[RiskLevel] = None


class StudentProfileResponse(BaseModel):
    student_id: str
    student_name: str
    email: str
    department: str
    year: int
    report_summary: str
    attendance_percent: int
    marks: Dict[str, int]
    skills: List[SkillProgress]
    resume_summary: str
    resume_link: str
    leetcode_progress: str
    leetcode_solved: int
    leetcode_rating: int
    project_highlights: List[str]
    mentor_notes: List[str]
    parent_notes: List[str]
    cgpa: float
    backlogs: int
    overall_risk: RiskLevel
    placement_probability: RiskLevel


# ── Academic ─────────────────────────────────────────────────────────

class AcademicResponse(BaseModel):
    semester: int
    cgpa: float
    sgpa: float
    class_rank: Optional[int] = None
    backlogs: int = 0
    internal_avg: Optional[float] = None
    external_avg: Optional[float] = None

    class Config:
        from_attributes = True


class AcademicUpdate(BaseModel):
    semester: Optional[int] = None
    cgpa: Optional[float] = Field(default=None, ge=0, le=10)
    sgpa: Optional[float] = Field(default=None, ge=0, le=10)
    class_rank: Optional[int] = None
    backlogs: Optional[int] = Field(default=None, ge=0)
    internal_avg: Optional[float] = None
    external_avg: Optional[float] = None


# ── Attendance ───────────────────────────────────────────────────────

class AttendanceResponse(BaseModel):
    semester: int
    attendance_percentage: float
    classes_attended: Optional[int] = None
    classes_conducted: Optional[int] = None
    low_attendance: bool = False

    class Config:
        from_attributes = True


class AttendanceUpdate(BaseModel):
    semester: Optional[int] = None
    attendance_percentage: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )
    classes_attended: Optional[int] = Field(default=None, ge=0)
    classes_conducted: Optional[int] = Field(default=None, ge=0)


# ── Skills ───────────────────────────────────────────────────────────

class SkillResponse(BaseModel):
    python: int = 0
    java: int = 0
    sql: int = 0
    machine_learning: int = 0
    data_science: int = 0
    communication: int = 0
    coding_score: int = 0

    class Config:
        from_attributes = True


class SkillUpdate(BaseModel):
    python: Optional[int] = Field(default=None, ge=0, le=100)
    java: Optional[int] = Field(default=None, ge=0, le=100)
    sql: Optional[int] = Field(default=None, ge=0, le=100)
    machine_learning: Optional[int] = Field(default=None, ge=0, le=100)
    data_science: Optional[int] = Field(default=None, ge=0, le=100)
    communication: Optional[int] = Field(default=None, ge=0, le=100)
    coding_score: Optional[int] = Field(default=None, ge=0)


# ── Placement ───────────────────────────────────────────────────────

class PlacementResponse(BaseModel):
    aptitude_score: int = 0
    resume_score: int = 0
    communication_score: int = 0
    interview_readiness: int = 0
    employability_score: float = 0.0
    placement_probability: str = "Low"
    placed: bool = False
    package_lpa: float = 0.0

    class Config:
        from_attributes = True


class PlacementUpdate(BaseModel):
    aptitude_score: Optional[int] = Field(default=None, ge=0, le=100)
    resume_score: Optional[int] = Field(default=None, ge=0, le=100)
    communication_score: Optional[int] = Field(default=None, ge=0, le=100)
    interview_readiness: Optional[int] = Field(default=None, ge=0, le=100)
    employability_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=100
    )
    placement_probability: Optional[RiskLevel] = None
    placed: Optional[bool] = None
    package_lpa: Optional[float] = Field(default=None, ge=0)


# ── Portfolio ────────────────────────────────────────────────────────

class PortfolioResponse(BaseModel):
    projects: int = 0
    certifications: int = 0
    github_repositories: int = 0
    github_score: int = 0

    class Config:
        from_attributes = True


class PortfolioUpdate(BaseModel):
    projects: Optional[int] = Field(default=None, ge=0)
    certifications: Optional[int] = Field(default=None, ge=0)
    github_repositories: Optional[int] = Field(default=None, ge=0)
    github_score: Optional[int] = Field(default=None, ge=0)


# ── Risk Prediction ─────────────────────────────────────────────────

class RiskPredictionResponse(BaseModel):
    backlog_risk: str = "Low"
    dropout_risk: str = "Low"
    attendance_risk: str = "Low"
    placement_risk: str = "Low"
    overall_risk: str = "Low"
    ai_suggestion: Optional[str] = None

    class Config:
        from_attributes = True


class RiskPredictionUpdate(BaseModel):
    backlog_risk: Optional[RiskLevel] = None
    dropout_risk: Optional[RiskLevel] = None
    attendance_risk: Optional[RiskLevel] = None
    placement_risk: Optional[RiskLevel] = None
    overall_risk: Optional[RiskLevel] = None
    ai_suggestion: Optional[str] = None


# ── ML Simulation ────────────────────────────────────────────────────

class MlSimulationRequest(BaseModel):
    attendance_percentage: float = 85.0
    cgpa: float = 7.5
    backlogs: int = 0
    coding_score: int = 200
    aptitude_score: int = 75
    resume_score: int = 75
    communication_score: int = 80
    interview_readiness: int = 75


class FeatureImportanceItem(BaseModel):
    name: str
    val: str
    importance: float
    status: str


class MlSimulationResponse(BaseModel):
    overall_risk: str
    employability_score: float
    placement_probability: str
    ai_suggestion: str
    feature_importances: List[FeatureImportanceItem]


# ── Dashboard aggregate schemas ─────────────────────────────────────

class StudentDashboardResponse(BaseModel):
    attendance_percent: float
    cgpa: float
    backlogs: int
    placement_probability: str
    employability_score: float
    overall_risk: str
    ai_suggestion: str
    academics_trend: List[AcademicResponse]
    skills: List[SkillProgress]
    portfolio: Optional[PortfolioResponse] = None


class RiskDistributionItem(BaseModel):
    level: str
    students: int


class StudentTableRow(BaseModel):
    student_id: str
    name: str
    department: str
    year: int
    overall_risk: str
    attendance_percentage: Optional[float] = None
    cgpa: Optional[float] = None
    employability_score: Optional[float] = None

    class Config:
        from_attributes = True


class AdminDashboardResponse(BaseModel):
    total_students: int
    high_risk_students: int
    low_attendance_students: int
    placement_ready_students: int
    risk_distribution: List[RiskDistributionItem]
    alerts: List[str]
    student_rows: List[StudentTableRow]


class ParentDashboardResponse(BaseModel):
    child_name: str
    branch: str
    year: int
    attendance_percent: float
    current_cgpa: float
    risk_level: str
    announcements: List[str]
    recommendations: List[str]
    academics_trend: List[AcademicResponse]
    skills: List[SkillProgress]
    portfolio: Optional[PortfolioResponse] = None


class FacultyStudentRow(BaseModel):
    student_id: str
    name: str
    department: str
    year: int
    section: Optional[str] = None
    cgpa: Optional[float] = None
    attendance_percentage: Optional[float] = None
    overall_risk: str = "Low"
    backlogs: int = 0


class FacultyDashboardResponse(BaseModel):
    total_students: int
    avg_cgpa: float
    low_attendance_count: int
    high_risk_count: int
    students: List[FacultyStudentRow]
    attendance_trend: List[dict]
    skill_averages: dict


class PlacementCandidateRow(BaseModel):
    student_id: str
    name: str
    department: str
    year: int
    aptitude_score: int = 0
    resume_score: int = 0
    communication_score: int = 0
    interview_readiness: int = 0
    employability_score: float = 0.0
    placement_probability: str = "Low"
    placed: bool = False
    package_lpa: float = 0.0
    coding_score: int = 0


class PlacementDashboardResponse(BaseModel):
    total_candidates: int
    placed_count: int
    avg_employability: float
    avg_package: float
    candidates: List[PlacementCandidateRow]
    probability_distribution: List[RiskDistributionItem]
    score_bands: List[dict]


class RecruiterCandidateRow(BaseModel):
    student_id: str
    name: str
    department: str
    year: int
    cgpa: Optional[float] = None
    employability_score: float = 0.0
    coding_score: int = 0
    projects: int = 0
    certifications: int = 0
    github_score: int = 0
    placement_probability: str = "Low"
    skills: Dict[str, int] = Field(default_factory=dict)


class RecruiterDashboardResponse(BaseModel):
    total_candidates: int
    avg_cgpa: float
    avg_employability: float
    top_skills: Dict[str, float] = Field(default_factory=dict)
    candidates: List[RecruiterCandidateRow]