from pydantic import BaseModel


class StudentBase(BaseModel):
    student_id: str
    name: str
    email: str
    department: str
    year: int


class StudentCreate(StudentBase):
    pass


class StudentResponse(StudentBase):
    id: int

    class Config:
        from_attributes = True


class AcademicBase(BaseModel):
    student_id: str
    semester: int
    cgpa: float
    sgpa: float
    class_rank: int
    backlogs: int
    internal_avg: float
    external_avg: float


class AcademicResponse(AcademicBase):
    id: int

    class Config:
        from_attributes = True


class AttendanceBase(BaseModel):
    student_id: str
    semester: int
    attendance_percentage: float
    classes_attended: int
    classes_conducted: int
    low_attendance: bool


class AttendanceResponse(AttendanceBase):
    id: int

    class Config:
        from_attributes = True


class SkillBase(BaseModel):
    student_id: str
    python: int
    java: int
    sql: int
    machine_learning: int
    data_science: int
    communication: int
    coding_score: int


class SkillResponse(SkillBase):
    id: int

    class Config:
        from_attributes = True


class PortfolioBase(BaseModel):
    student_id: str
    projects: int
    certifications: int
    github_repositories: int
    github_score: int


class PortfolioResponse(PortfolioBase):
    id: int

    class Config:
        from_attributes = True


class PlacementBase(BaseModel):
    student_id: str
    aptitude_score: int
    resume_score: int
    communication_score: int
    interview_readiness: int
    employability_score: float
    placement_probability: str
    placed: int
    package_lpa: float


class PlacementResponse(PlacementBase):
    id: int

    class Config:
        from_attributes = True


class RiskPredictionBase(BaseModel):
    student_id: str
    backlog_risk: str
    attendance_risk: str
    placement_risk: str
    overall_risk: str
    ai_suggestion: str


class RiskPredictionResponse(RiskPredictionBase):
    id: int

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    student: StudentResponse | None = None
    academics: AcademicResponse | None = None
    attendance: AttendanceResponse | None = None
    skills: SkillResponse | None = None
    portfolio: PortfolioResponse | None = None
    placement: PlacementResponse | None = None
    risk_prediction: RiskPredictionResponse | None = None

    class Config:
        from_attributes = True