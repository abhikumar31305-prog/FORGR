from datetime import datetime
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional

Role = Literal["student", "faculty", "placement_cell", "parent", "recruiter", "admin"]
RiskLevel = Literal["Low", "Medium", "High"]

# ── Student ──────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    student_id: str
    name: str
    email: str
    department: str
    year: int

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


# ── Auth ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Role
    linked_profile_id: Optional[int] = None


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    password: str = Field(min_length=8)


class EmailVerificationConfirm(BaseModel):
    token: str


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


# ── Profile (existing) ──────────────────────────────────────────────

class SkillProgress(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)


class StudentProfileUpdate(BaseModel):
    attendance_percent: Optional[float] = Field(default=None, ge=0, le=100)
    marks: Optional[Dict[str, float]] = None
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
    attendance_percent: float
    marks: Dict[str, float]
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


# ── Granular record response & update schemas ────────────────────────

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
    attendance_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    classes_attended: Optional[int] = Field(default=None, ge=0)
    classes_conducted: Optional[int] = Field(default=None, ge=0)


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
    employability_score: Optional[float] = Field(default=None, ge=0, le=100)
    placement_probability: Optional[RiskLevel] = None
    placed: Optional[bool] = None
    package_lpa: Optional[float] = Field(default=None, ge=0)


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


class RiskPredictionResponse(BaseModel):
    backlog_risk: str = "Low"
    dropout_risk: str = "Low"
    attendance_risk: str = "Low"
    placement_risk: str = "Low"
    overall_risk: str = "Low"
    ai_suggestion: Optional[str] = None
    model_version: Optional[str] = None
    model_name: Optional[str] = None
    confidence: Optional[float] = None

    class Config:
        from_attributes = True


class RiskPredictionUpdate(BaseModel):
    backlog_risk: Optional[RiskLevel] = None
    dropout_risk: Optional[RiskLevel] = None
    attendance_risk: Optional[RiskLevel] = None
    placement_risk: Optional[RiskLevel] = None
    overall_risk: Optional[RiskLevel] = None
    ai_suggestion: Optional[str] = None


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



# ── Dashboard aggregate schemas ──────────────────────────────────────

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
    avg_employability: float = 70.0
    avg_attendance: float = 80.0
    avg_cgpa: float = 7.0
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


# ── Bulk Import & Audit Log Schemas ──────────────────────────────────

class ImportValidationError(BaseModel):
    row_number: int
    student_id: Optional[str] = None
    field: str
    invalid_value: Optional[str] = None
    error_reason: str
    suggested_correction: str
    severity: Literal["error", "warning", "duplicate"] = "error"


class ColumnMappingItem(BaseModel):
    detected_column: str
    mapped_field: str
    status: Literal["valid", "optional", "unmapped", "custom"] = "valid"


class ImportPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    warning_rows: int
    error_rows: int
    duplicate_rows: int
    new_students: int = 0
    existing_students: int = 0
    invalid_rows: int = 0
    current_db_students: int = 0
    blocking_errors: bool = False
    columns_detected: List[str]
    mappings: List[ColumnMappingItem]
    preview_records: List[Dict[str, Any]]
    validation_errors: List[ImportValidationError]
    can_import: bool


class ImportHistoryItem(BaseModel):
    id: int
    import_batch_id: str
    admin_email: str
    dataset_type: str
    import_mode: str
    file_name: str
    total_rows: int
    inserted_rows: int
    updated_rows: int
    skipped_rows: int
    failed_rows: int
    status: str
    error_log_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogItem(BaseModel):
    id: int
    table_name: str
    student_id: Optional[str] = None
    user_email: str
    action: str
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── ML Model Registry Schemas ────────────────────────────────────────

class ModelRegistryCreate(BaseModel):
    model_name: str
    model_version: str
    model_type: str  # 'backlog_risk', 'placement', 'employability', 'career'
    file_path: str
    metrics_json: Optional[str] = None


class ModelRegistryResponse(BaseModel):
    id: int
    model_name: str
    model_version: str
    model_type: str
    file_path: str
    metrics_json: Optional[str] = None
    is_active: bool = False
    created_at: datetime
    promoted_at: Optional[datetime] = None
    promoted_by: Optional[str] = None

    class Config:
        from_attributes = True


# ── ML Monitoring Schemas ────────────────────────────────────────────

class PredictionLogResponse(BaseModel):
    id: int
    student_id: str
    model_type: str
    model_version: Optional[str] = None
    prediction: str
    confidence: Optional[float] = None
    input_features_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DriftReportResponse(BaseModel):
    id: int
    model_type: str
    model_version: Optional[str] = None
    psi_score: float
    feature_drifts_json: Optional[str] = None
    is_drifted: bool = False
    window_start: datetime
    window_end: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class MonitoringMetricsResponse(BaseModel):
    model_type: str
    total_predictions: int
    avg_confidence: float
    risk_distribution: Dict[str, int]
    recent_drift: Optional[DriftReportResponse] = None
    prediction_volume_24h: int
    prediction_volume_7d: int


# ── Compliance / Audit Schemas ───────────────────────────────────────

class ComprehensiveAuditLogItem(BaseModel):
    id: int
    timestamp: datetime
    actor_email: str
    actor_role: Optional[str] = None
    action_type: str
    resource_type: str
    resource_id: Optional[str] = None
    details_json: Optional[str] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None

    class Config:
        from_attributes = True


class ConsentRequest(BaseModel):
    consent_type: str  # 'data_processing', 'analytics', 'marketing', 'third_party_sharing'
    granted: bool = True
    policy_version: str = "1.0"


class ConsentResponse(BaseModel):
    id: int
    user_id: int
    consent_type: str
    granted: bool
    granted_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    policy_version: str = "1.0"

    class Config:
        from_attributes = True


class ConsentSummary(BaseModel):
    """Aggregated consent status for a user."""
    data_processing: bool = False
    analytics: bool = False
    marketing: bool = False
    third_party_sharing: bool = False
    consents: List[ConsentResponse] = []

