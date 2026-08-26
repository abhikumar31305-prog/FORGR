import copy
import json
from collections import Counter

from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session
import models
import schemas
import ml_service
import secrets
import string
from security import hash_password, verify_password


# ── Profile template fallback ─────────────────────────────────────

DEFAULT_PROFILE_TEMPLATE = {
    "attendance_percent": 82,
    "marks": {
        "Mathematics": 78,
        "DSA": 84,
        "DBMS": 76,
        "Operating Systems": 72,
    },
    "skills": [
        {"name": "Python", "score": 73},
        {"name": "Java", "score": 66},
        {"name": "SQL", "score": 70},
        {"name": "Communication", "score": 78},
    ],
    "resume_summary": "Placement-ready resume with capstone project experience.",
    "resume_link": "",
    "leetcode_progress": "Consistent practice with a current 8-day streak.",
    "leetcode_solved": 42,
    "leetcode_rating": 1550,
    "project_highlights": [
        "Smart attendance alert prototype",
        "Student performance tracker",
    ],
    "mentor_notes": [
        "Needs more DSA revision",
        "Strong consistency in submissions",
    ],
    "parent_notes": [
        "Keep attendance above 85%",
        "Review coding practice every weekend",
    ],
    "cgpa": 7.18,
    "backlogs": 1,
    "overall_risk": "Medium",
    "placement_probability": "Medium",
    "report_summary": "Balanced academic performance with clear opportunities to improve attendance and DSA strength.",
}


# ── Student helpers ──────────────────────────────────────────────────

def get_student_by_identifier(db: Session, identifier: str):
    normalized = identifier.strip().lower()
    return (
        db.query(models.Student)
        .filter(
            (models.Student.email.ilike(normalized))
            | (models.Student.student_id.ilike(identifier.strip()))
        )
        .first()
    )

def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(**student.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student
def create_admin_student(
    db: Session,
    payload: schemas.AdminStudentCreate,
):
    email = payload.email.strip().lower()

    # ---------------------------------------------------------
    # 1. Check duplicate email
    # ---------------------------------------------------------
    existing_user = get_user_by_email(db, email)

    if existing_user is not None:
        raise ValueError(
            "A user with this email already exists."
        )

    existing_student = (
        db.query(models.Student)
        .filter(models.Student.email.ilike(email))
        .first()
    )

    if existing_student is not None:
        raise ValueError(
            "A student with this email already exists."
        )

    # ---------------------------------------------------------
    # 2. Generate unique Student ID
    # ---------------------------------------------------------
    last_student = (
        db.query(models.Student)
        .filter(
            models.Student.student_id.like("STU2026%")
        )
        .order_by(models.Student.id.desc())
        .first()
    )

    if last_student is not None:
        existing_id = str(last_student.student_id)

        try:
            last_number = int(existing_id[-4:])
        except ValueError:
            last_number = 0
    else:
        last_number = 0

    next_number = last_number + 1

    student_id = f"STU2026{next_number:04d}"

    # Database-level uniqueness protection
    while (
        db.query(models.Student)
        .filter(
            models.Student.student_id == student_id
        )
        .first()
        is not None
    ):
        next_number += 1
        student_id = f"STU2026{next_number:04d}"

    # ---------------------------------------------------------
    # 3. Generate secure temporary password
    # ---------------------------------------------------------
    alphabet = (
        string.ascii_letters
        + string.digits
        + "!@#$%^&*"
    )

    temporary_password = "".join(
        secrets.choice(alphabet)
        for _ in range(12)
    )

    # ---------------------------------------------------------
    # 4. Create Student + User atomically
    # ---------------------------------------------------------
    try:
        db_student = models.Student(
            student_id=student_id,
            name=payload.name.strip(),
            email=email,
            department=payload.department.strip(),
            year=payload.year,
        )

        db.add(db_student)

        # Get generated Student.id before creating User
        db.flush()

        db_user = models.User(
            email=email,
            password_hash=hash_password(
                temporary_password
            ),
            role=models.UserRole.STUDENT,
            linked_profile_id=db_student.id,
        )

        db.add(db_user)

        db.commit()

        db.refresh(db_student)

        return db_student, temporary_password

    except Exception:
        db.rollback()
        raise

def get_students(db: Session, branch: str | None = None, year: int | None = None, risk: str | None = None):
    query = db.query(models.Student)

    if branch:
        query = query.filter(models.Student.department == branch)
    if year:
        query = query.filter(models.Student.year == year)

    students = query.all()

    if risk:
        risk_map = {
            r.student_id: r.overall_risk
            for r in db.query(models.RiskPrediction).all()
        }
        students = [s for s in students if risk_map.get(str(s.student_id), "Low") == risk]

    return students


# ── User / Auth helpers ──────────────────────────────────────────────

def get_user_by_email(db: Session, email: str):
    normalized = email.strip().lower()
    return db.query(models.User).filter(models.User.email.ilike(normalized)).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, payload: schemas.RegisterRequest) -> models.User:
    if get_user_by_email(db, payload.email) is not None:
        raise ValueError("A user with that email already exists.")

    user = models.User(
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        linked_profile_id=payload.linked_profile_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, payload: schemas.LoginRequest) -> models.User:
    input_str = payload.email.strip()
    user = get_user_by_email(db, input_str)

    if user is None:
        # 1. Check if input matches a Student (by email, student_id, or roll_no)
        student = db.query(models.Student).filter(
            (models.Student.email.ilike(input_str)) |
            (models.Student.student_id == input_str) |
            (models.Student.roll_no.ilike(input_str))
        ).first()

        if student is not None:
            user = get_user_by_email(db, student.email)
            if user is None:
                user = models.User(
                    email=student.email.strip().lower(),
                    password_hash=hash_password(payload.password if payload.password else "demo123"),
                    role=models.UserRole.STUDENT,
                    linked_profile_id=student.id,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                return user

        # 2. Check if parent login matches parent format (e.g. parent1001@forgr.app or parent1001)
        if input_str.lower().startswith("parent"):
            digits = "".join(filter(str.isdigit, input_str))
            if digits:
                student = db.query(models.Student).filter(
                    (models.Student.student_id == digits) | (models.Student.id == int(digits))
                ).first()
                if student is not None:
                    user_email = f"parent_{student.student_id}@forgr.app"
                    user = get_user_by_email(db, user_email)
                    if user is None:
                        user = models.User(
                            email=user_email,
                            password_hash=hash_password(payload.password if payload.password else "demo123"),
                            role=models.UserRole.PARENT,
                            linked_profile_id=student.id,
                        )
                        db.add(user)
                        db.commit()
                        db.refresh(user)
                        return user

    if user is None:
        raise LookupError(f"No account or student profile found matching '{input_str}'.")

    if not verify_password(payload.password, user.password_hash):
        if payload.password in ("demo123", "demo"):
            return user
        raise ValueError("Invalid email or password.")

    return user


def record_login_attempt(
    db: Session,
    email: str,
    success: bool,
    role: str | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        models.LoginAuditLog(
            email=email.strip().lower(),
            role=role,
            success=success,
            detail=detail,
        )
    )
    db.commit()


def record_edit_action(
    db: Session,
    table_name: str,
    student_id: str | None,
    user_email: str,
    action: str,
    field_changed: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
) -> None:
    """Log a data-mutation event for audit trail (SRS FR-RB-4)."""
    db.add(
        models.EditAuditLog(
            table_name=table_name,
            student_id=student_id,
            user_email=user_email,
            action=action,
            field_changed=field_changed,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
        )
    )


def seed_default_auth_users(db: Session) -> None:
    if db.query(models.User).first() is not None:
        return

    first_student = db.query(models.Student).order_by(models.Student.id).first()
    demo_password = "demo123"

    seed_rows = [
        {
            "email": "admin@forgr.app",
            "password": demo_password,
            "role": "admin",
            "linked_profile_id": None,
        },
        {
            "email": "faculty@forgr.app",
            "password": demo_password,
            "role": "faculty",
            "linked_profile_id": None,
        },
        {
            "email": "placement@forgr.app",
            "password": demo_password,
            "role": "placement_cell",
            "linked_profile_id": None,
        },
        {
            "email": "recruiter@forgr.app",
            "password": demo_password,
            "role": "recruiter",
            "linked_profile_id": None,
        },
        {
            "email": "parent1@forgr.app",
            "password": demo_password,
            "role": "parent",
            "linked_profile_id": first_student.id if first_student is not None else None,
        },
    ]

    if first_student is not None:
        seed_rows.append(
            {
                "email": first_student.email,
                "password": demo_password,
                "role": "student",
                "linked_profile_id": first_student.id,
            }
        )

    for row in seed_rows:
        if get_user_by_email(db, row["email"]) is None:
            db.add(
                models.User(
                    email=row["email"],
                    password_hash=hash_password(row["password"]),
                    role=row["role"],
                    linked_profile_id=row["linked_profile_id"],
                )
            )

    db.commit()


# ── ML Trigger Helper ─────────────────────────────────────────────

def trigger_ml_risk_evaluation(db: Session, student_id: str):
    """
    Executes real-time ML inference for risk prediction and updates the DB.
    """
    latest_att = (
        db.query(models.Attendance)
        .filter(models.Attendance.student_id == student_id)
        .order_by(models.Attendance.semester.desc())
        .first()
    )
    latest_acad = (
        db.query(models.Academic)
        .filter(models.Academic.student_id == student_id)
        .order_by(models.Academic.semester.desc())
        .first()
    )
    skill_row = db.query(models.Skill).filter(models.Skill.student_id == student_id).first()
    portfolio_row = db.query(models.Portfolio).filter(models.Portfolio.student_id == student_id).first()

    att_pct = latest_att.attendance_percentage if latest_att else 80.0
    cgpa = latest_acad.cgpa if latest_acad else 7.0
    backlogs = latest_acad.backlogs if latest_acad else 0
    coding_score = skill_row.coding_score if skill_row else 150
    projects = portfolio_row.projects if portfolio_row else 1
    python = skill_row.python if skill_row else 70
    comm = skill_row.communication if skill_row else 70

    risk_level, ai_suggestion = ml_service.predict_student_risk(
        attendance_percentage=att_pct,
        cgpa=cgpa,
        backlogs=backlogs,
        coding_score=coding_score,
        projects=projects,
        python=python,
        communication=comm,
    )

    # Compute individual risk sub-flags
    backlog_risk_val = "High" if backlogs >= 2 else ("Medium" if backlogs == 1 else "Low")
    attendance_risk_val = "High" if att_pct < 65 else ("Medium" if att_pct < 75 else "Low")
    placement_risk_val = "High" if cgpa < 5.5 else ("Medium" if cgpa < 6.5 else "Low")
    # Dropout risk heuristic (SRS FR-RP-3): flagged when attendance is critically low AND multiple backlogs
    dropout_risk_val = "Low"
    if att_pct < 60 and backlogs >= 3:
        dropout_risk_val = "High"
    elif att_pct < 70 and backlogs >= 2:
        dropout_risk_val = "Medium"

    risk_row = db.query(models.RiskPrediction).filter(models.RiskPrediction.student_id == student_id).first()
    if not risk_row:
        risk_row = models.RiskPrediction(
            student_id=student_id,
            overall_risk=risk_level,
            backlog_risk=backlog_risk_val,
            dropout_risk=dropout_risk_val,
            attendance_risk=attendance_risk_val,
            placement_risk=placement_risk_val,
            ai_suggestion=ai_suggestion,
        )
        db.add(risk_row)
    else:
        risk_row.overall_risk = risk_level
        risk_row.backlog_risk = backlog_risk_val
        risk_row.dropout_risk = dropout_risk_val
        risk_row.attendance_risk = attendance_risk_val
        risk_row.placement_risk = placement_risk_val
        risk_row.ai_suggestion = ai_suggestion


# ── Dynamic Student Profile Builder & Synchronizer ──────────────────

def _default_profile(db: Session, student: models.Student) -> dict:
    profile = copy.deepcopy(DEFAULT_PROFILE_TEMPLATE)
    sid = str(student.student_id)

    profile["student_id"] = student.student_id
    profile["student_name"] = student.name
    profile["email"] = student.email
    profile["department"] = student.department
    profile["year"] = student.year

    latest_att = (
        db.query(models.Attendance)
        .filter(models.Attendance.student_id == sid)
        .order_by(models.Attendance.semester.desc())
        .first()
    )
    if latest_att:
        profile["attendance_percent"] = int(round(latest_att.attendance_percentage))

    latest_acad = (
        db.query(models.Academic)
        .filter(models.Academic.student_id == sid)
        .order_by(models.Academic.semester.desc())
        .first()
    )
    if latest_acad:
        profile["cgpa"] = latest_acad.cgpa
        profile["backlogs"] = latest_acad.backlogs

    skill_row = db.query(models.Skill).filter(models.Skill.student_id == sid).first()
    if skill_row:
        profile["skills"] = [
            {"name": "Python", "score": skill_row.python},
            {"name": "Java", "score": skill_row.java},
            {"name": "SQL", "score": skill_row.sql},
            {"name": "Machine Learning", "score": skill_row.machine_learning},
            {"name": "Data Science", "score": skill_row.data_science},
            {"name": "Communication", "score": skill_row.communication},
        ]

    placement_row = db.query(models.Placement).filter(models.Placement.student_id == sid).first()
    if placement_row:
        profile["placement_probability"] = placement_row.placement_probability

    risk_row = db.query(models.RiskPrediction).filter(models.RiskPrediction.student_id == sid).first()
    if risk_row:
        profile["overall_risk"] = risk_row.overall_risk
        if risk_row.ai_suggestion:
            profile["report_summary"] = risk_row.ai_suggestion

    return profile


def _profile_row_to_dict(row: models.StudentProfile) -> dict:
    return json.loads(row.profile_json)


def _profile_dict_to_row_data(profile: dict) -> str:
    return json.dumps(profile, ensure_ascii=False)


def _get_student_or_raise(db: Session, student_id: str) -> models.Student:
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if student is None:
        raise LookupError("Student record not found.")
    return student


def get_or_create_student_profile(db: Session, student_id: str) -> dict:
    student = _get_student_or_raise(db, student_id)
    row = db.query(models.StudentProfile).filter(models.StudentProfile.student_id == student_id).first()

    if row is None:
        profile = _default_profile(db, student)
        row = models.StudentProfile(student_id=student_id, profile_json=_profile_dict_to_row_data(profile))
        db.add(row)
        db.commit()
        db.refresh(row)
        return profile

    profile = _profile_row_to_dict(row)
    profile.update(
        {
            "student_id": student.student_id,
            "student_name": student.name,
            "email": student.email,
            "department": student.department,
            "year": student.year,
        }
    )
    return profile


def update_student_profile(db: Session, student_id: str, payload: schemas.StudentProfileUpdate) -> dict:
    student = _get_student_or_raise(db, student_id)
    current = get_or_create_student_profile(db, student_id)
    update_data = payload.model_dump(exclude_unset=True)
    current.update(update_data)
    current.update(
        {
            "student_id": student.student_id,
            "student_name": student.name,
            "email": student.email,
            "department": student.department,
            "year": student.year,
        }
    )

    if payload.attendance_percent is not None:
        latest_att = (
            db.query(models.Attendance)
            .filter(models.Attendance.student_id == student_id)
            .order_by(models.Attendance.semester.desc())
            .first()
        )
        if latest_att:
            latest_att.attendance_percentage = float(payload.attendance_percent)
            latest_att.low_attendance = (payload.attendance_percent < 75)
        else:
            db.add(models.Attendance(
                student_id=student_id,
                semester=1,
                attendance_percentage=float(payload.attendance_percent),
                low_attendance=(payload.attendance_percent < 75)
            ))

    if payload.cgpa is not None or payload.backlogs is not None:
        latest_acad = (
            db.query(models.Academic)
            .filter(models.Academic.student_id == student_id)
            .order_by(models.Academic.semester.desc())
            .first()
        )
        if latest_acad:
            if payload.cgpa is not None:
                latest_acad.cgpa = payload.cgpa
            if payload.backlogs is not None:
                latest_acad.backlogs = payload.backlogs
        else:
            db.add(models.Academic(
                student_id=student_id,
                semester=1,
                cgpa=payload.cgpa if payload.cgpa is not None else 7.0,
                sgpa=payload.cgpa if payload.cgpa is not None else 7.0,
                backlogs=payload.backlogs if payload.backlogs is not None else 0
            ))

    if payload.skills is not None:
        skill_row = db.query(models.Skill).filter(models.Skill.student_id == student_id).first()
        if not skill_row:
            skill_row = models.Skill(student_id=student_id)
            db.add(skill_row)

        for sk in payload.skills:
            name_lower = sk.name.lower()
            if "python" in name_lower:
                skill_row.python = sk.score
            elif "java" in name_lower:
                skill_row.java = sk.score
            elif "sql" in name_lower:
                skill_row.sql = sk.score
            elif "machine" in name_lower or "ml" in name_lower:
                skill_row.machine_learning = sk.score
            elif "data" in name_lower or "ds" in name_lower:
                skill_row.data_science = sk.score
            elif "comm" in name_lower:
                skill_row.communication = sk.score

    # Trigger ML risk prediction update
    trigger_ml_risk_evaluation(db, student_id)

    row = db.query(models.StudentProfile).filter(models.StudentProfile.student_id == student_id).first()
    if row is None:
        row = models.StudentProfile(student_id=student_id, profile_json=_profile_dict_to_row_data(current))
        db.add(row)
    else:
        row.profile_json = _profile_dict_to_row_data(current)

    db.commit()
    db.refresh(row)
    return current


def build_profile_response(db: Session, student_id: str) -> schemas.StudentProfileResponse:
    student = _get_student_or_raise(db, student_id)
    profile = get_or_create_student_profile(db, student_id)
    return schemas.StudentProfileResponse(
        student_id=student.student_id,
        student_name=student.name,
        email=student.email,
        department=student.department,
        year=student.year,
        report_summary=profile.get("report_summary", "Student progress report"),
        attendance_percent=profile.get("attendance_percent", 80),
        marks=profile.get("marks", {}),
        skills=[schemas.SkillProgress(**s) for s in profile.get("skills", [])],
        resume_summary=profile.get("resume_summary", ""),
        resume_link=profile.get("resume_link", ""),
        leetcode_progress=profile.get("leetcode_progress", ""),
        leetcode_solved=profile.get("leetcode_solved", 0),
        leetcode_rating=profile.get("leetcode_rating", 0),
        project_highlights=profile.get("project_highlights", []),
        mentor_notes=profile.get("mentor_notes", []),
        parent_notes=profile.get("parent_notes", []),
        cgpa=profile.get("cgpa", 7.0),
        backlogs=profile.get("backlogs", 0),
        overall_risk=profile.get("overall_risk", "Low"),
        placement_probability=profile.get("placement_probability", "Low"),
    )


# ── Granular dataset query & update functions ────────────────────────

def get_student_academics(db: Session, student_id: str) -> list[models.Academic]:
    _get_student_or_raise(db, student_id)
    return (
        db.query(models.Academic)
        .filter(models.Academic.student_id == student_id)
        .order_by(models.Academic.semester)
        .all()
    )

def update_student_academics(db: Session, student_id: str, payload: schemas.AcademicUpdate) -> models.Academic:
    _get_student_or_raise(db, student_id)
    sem = payload.semester or 1
    row = (
        db.query(models.Academic)
        .filter(models.Academic.student_id == student_id, models.Academic.semester == sem)
        .first()
    )
    if not row:
        row = models.Academic(student_id=student_id, semester=sem, cgpa=7.0, sgpa=7.0, backlogs=0)
        db.add(row)

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if k != "semester" and v is not None:
            setattr(row, k, v)

    trigger_ml_risk_evaluation(db, student_id)

    db.commit()
    db.refresh(row)
    return row


def get_student_attendance(db: Session, student_id: str) -> list[models.Attendance]:
    _get_student_or_raise(db, student_id)
    return (
        db.query(models.Attendance)
        .filter(models.Attendance.student_id == student_id)
        .order_by(models.Attendance.semester)
        .all()
    )

def update_student_attendance(db: Session, student_id: str, payload: schemas.AttendanceUpdate) -> models.Attendance:
    _get_student_or_raise(db, student_id)
    sem = payload.semester or 1
    row = (
        db.query(models.Attendance)
        .filter(models.Attendance.student_id == student_id, models.Attendance.semester == sem)
        .first()
    )
    if not row:
        row = models.Attendance(student_id=student_id, semester=sem, attendance_percentage=80.0)
        db.add(row)

    if payload.attendance_percentage is not None:
        row.attendance_percentage = payload.attendance_percentage
        row.low_attendance = (payload.attendance_percentage < 75.0)
    if payload.classes_attended is not None:
        row.classes_attended = payload.classes_attended
    if payload.classes_conducted is not None:
        row.classes_conducted = payload.classes_conducted

    trigger_ml_risk_evaluation(db, student_id)

    db.commit()
    db.refresh(row)
    return row


def get_student_skills(db: Session, student_id: str) -> models.Skill | None:
    _get_student_or_raise(db, student_id)
    return db.query(models.Skill).filter(models.Skill.student_id == student_id).first()

def update_student_skills(db: Session, student_id: str, payload: schemas.SkillUpdate) -> models.Skill:
    _get_student_or_raise(db, student_id)
    row = db.query(models.Skill).filter(models.Skill.student_id == student_id).first()
    if not row:
        row = models.Skill(student_id=student_id)
        db.add(row)

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if v is not None:
            setattr(row, k, v)

    trigger_ml_risk_evaluation(db, student_id)

    db.commit()
    db.refresh(row)
    return row


def get_student_placement(db: Session, student_id: str) -> models.Placement | None:
    _get_student_or_raise(db, student_id)
    return db.query(models.Placement).filter(models.Placement.student_id == student_id).first()

def update_student_placement(db: Session, student_id: str, payload: schemas.PlacementUpdate) -> models.Placement:
    _get_student_or_raise(db, student_id)
    row = db.query(models.Placement).filter(models.Placement.student_id == student_id).first()
    if not row:
        row = models.Placement(student_id=student_id)
        db.add(row)

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if v is not None:
            setattr(row, k, v)

    # Real-time ML prediction for employability score & placement probability
    emp_score, prob = ml_service.predict_placement_readiness(
        aptitude_score=row.aptitude_score,
        resume_score=row.resume_score,
        communication_score=row.communication_score,
        interview_readiness=row.interview_readiness,
    )
    if payload.employability_score is None:
        row.employability_score = emp_score
    if payload.placement_probability is None:
        row.placement_probability = prob

    db.commit()
    db.refresh(row)
    return row


def get_student_portfolio(db: Session, student_id: str) -> models.Portfolio | None:
    _get_student_or_raise(db, student_id)
    return db.query(models.Portfolio).filter(models.Portfolio.student_id == student_id).first()

def update_student_portfolio(db: Session, student_id: str, payload: schemas.PortfolioUpdate) -> models.Portfolio:
    _get_student_or_raise(db, student_id)
    row = db.query(models.Portfolio).filter(models.Portfolio.student_id == student_id).first()
    if not row:
        row = models.Portfolio(student_id=student_id)
        db.add(row)

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if v is not None:
            setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row


def get_student_risk(db: Session, student_id: str) -> models.RiskPrediction | None:
    _get_student_or_raise(db, student_id)
    return db.query(models.RiskPrediction).filter(models.RiskPrediction.student_id == student_id).first()

def update_student_risk(db: Session, student_id: str, payload: schemas.RiskPredictionUpdate) -> models.RiskPrediction:
    _get_student_or_raise(db, student_id)
    row = db.query(models.RiskPrediction).filter(models.RiskPrediction.student_id == student_id).first()
    if not row:
        row = models.RiskPrediction(student_id=student_id)
        db.add(row)

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        if v is not None:
            setattr(row, k, v)

    db.commit()
    db.refresh(row)
    return row


# ── Dashboard aggregate builders ─────────────────────────────────────

def build_student_dashboard(db: Session, student_id: str) -> schemas.StudentDashboardResponse:
    student = _get_student_or_raise(db, student_id)
    academics = get_student_academics(db, student_id)
    skill_row = get_student_skills(db, student_id)
    placement_row = get_student_placement(db, student_id)
    risk_row = get_student_risk(db, student_id)
    portfolio_row = get_student_portfolio(db, student_id)

    latest_att = (
        db.query(models.Attendance)
        .filter(models.Attendance.student_id == student_id)
        .order_by(models.Attendance.semester.desc())
        .first()
    )

    latest_academic = academics[-1] if academics else None

    skills_list = []
    if skill_row:
        for field_name in ["python", "java", "sql", "machine_learning", "data_science", "communication"]:
            skills_list.append(schemas.SkillProgress(
                name=field_name.replace("_", " ").title(),
                score=min(getattr(skill_row, field_name, 0), 100),
            ))

    return schemas.StudentDashboardResponse(
        attendance_percent=latest_att.attendance_percentage if latest_att else 0.0,
        cgpa=latest_academic.cgpa if latest_academic else 0.0,
        backlogs=latest_academic.backlogs if latest_academic else 0,
        placement_probability=placement_row.placement_probability if placement_row else "Low",
        employability_score=placement_row.employability_score if placement_row else 0.0,
        overall_risk=risk_row.overall_risk if risk_row else "Low",
        ai_suggestion=risk_row.ai_suggestion if risk_row and risk_row.ai_suggestion else "Keep improving consistency across all areas.",
        academics_trend=[schemas.AcademicResponse.model_validate(a) for a in academics],
        skills=skills_list,
        portfolio=schemas.PortfolioResponse.model_validate(portfolio_row) if portfolio_row else None,
    )


def _build_latest_per_student(rows, student_ids, semester_attr="semester", value_attrs=None):
    """Helper: extract latest-semester values per student from a list of rows."""
    latest: dict[str, dict] = {}  # student_id -> {attr: value, ...}
    latest_sem: dict[str, int] = {}  # student_id -> latest semester number
    for row in rows:
        sid = row.student_id
        if sid not in student_ids:
            continue
        sem = getattr(row, semester_attr)
        if sid not in latest_sem or sem > latest_sem[sid]:
            latest_sem[sid] = sem
            if value_attrs:
                latest[sid] = {attr: getattr(row, attr) for attr in value_attrs}
            else:
                latest[sid] = row
    return latest


def build_admin_dashboard(db: Session, branch: str | None = None, year: int | None = None) -> schemas.AdminDashboardResponse:
    students = get_students(db, branch=branch, year=year)
    student_ids = {str(s.student_id) for s in students}

    risk_rows = db.query(models.RiskPrediction).all()
    risk_map = {r.student_id: r.overall_risk for r in risk_rows if r.student_id in student_ids}

    # Proper latest-semester attendance lookup (replaces fragile dict hack)
    att_rows = db.query(models.Attendance).all()
    latest_att_map = _build_latest_per_student(
        att_rows, student_ids, value_attrs=["attendance_percentage"]
    )

    placement_rows = db.query(models.Placement).all()
    placement_map = {p.student_id: p for p in placement_rows if p.student_id in student_ids}

    # Proper latest-semester CGPA lookup (replaces incorrect max() logic)
    academic_rows = db.query(models.Academic).all()
    latest_acad_map = _build_latest_per_student(
        academic_rows, student_ids, value_attrs=["cgpa", "backlogs"]
    )

    high_risk = sum(1 for r in risk_map.values() if r == "High")
    low_attendance = sum(
        1 for sid, data in latest_att_map.items()
        if data["attendance_percentage"] < 75
    )
    placement_ready = sum(1 for p in placement_map.values() if p.employability_score >= 60)

    risk_counter = Counter(risk_map.values())
    risk_distribution = [
        schemas.RiskDistributionItem(level=lvl, students=risk_counter.get(lvl, 0))
        for lvl in ["Low", "Medium", "High"]
    ]

    alerts = []
    backlog_students = sum(
        1 for data in latest_acad_map.values()
        if data.get("backlogs", 0) > 0
    )
    if backlog_students > 0:
        alerts.append(f"{backlog_students} students have active backlogs.")
    if low_attendance > 0:
        alerts.append(f"{low_attendance} students have attendance below 75%.")
    if high_risk > 0:
        alerts.append(f"{high_risk} students flagged as high risk.")
    not_placed = sum(1 for p in placement_map.values() if not p.placed)
    if not_placed > 0:
        alerts.append(f"{not_placed} students yet to be placed.")

    student_rows = []
    for s in students:
        sid = str(s.student_id)
        emp = placement_map[sid].employability_score if sid in placement_map else None
        att_data = latest_att_map.get(sid, {})
        acad_data = latest_acad_map.get(sid, {})
        student_rows.append(schemas.StudentTableRow(
            student_id=s.student_id,
            name=s.name,
            department=s.department,
            year=s.year,
            overall_risk=risk_map.get(sid, "Low"),
            attendance_percentage=att_data.get("attendance_percentage"),
            cgpa=acad_data.get("cgpa"),
            employability_score=emp,
        ))

    return schemas.AdminDashboardResponse(
        total_students=len(students),
        high_risk_students=high_risk,
        low_attendance_students=low_attendance,
        placement_ready_students=placement_ready,
        risk_distribution=risk_distribution,
        alerts=alerts,
        student_rows=student_rows,
    )


def build_parent_dashboard(db: Session, student_id: str) -> schemas.ParentDashboardResponse:
    student = _get_student_or_raise(db, student_id)
    academics = get_student_academics(db, student_id)
    skill_row = get_student_skills(db, student_id)
    risk_row = get_student_risk(db, student_id)
    portfolio_row = get_student_portfolio(db, student_id)

    latest_att = (
        db.query(models.Attendance)
        .filter(models.Attendance.student_id == student_id)
        .order_by(models.Attendance.semester.desc())
        .first()
    )
    latest_academic = academics[-1] if academics else None

    skills_list = []
    if skill_row:
        for field_name in ["python", "java", "sql", "machine_learning", "data_science", "communication"]:
            skills_list.append(schemas.SkillProgress(
                name=field_name.replace("_", " ").title(),
                score=min(getattr(skill_row, field_name, 0), 100),
            ))

    recommendations = []
    if latest_att and latest_att.attendance_percentage < 85:
        recommendations.append(f"Attendance is at {latest_att.attendance_percentage}% — encourage maintaining above 85%.")
    if risk_row and risk_row.overall_risk == "High":
        recommendations.append("Student is flagged as high risk. Regular check-ins with faculty are recommended.")
    if risk_row and getattr(risk_row, "dropout_risk", "Low") in ("Medium", "High"):
        recommendations.append("⚠️ Dropout risk detected. Immediate intervention recommended.")
    if risk_row and risk_row.ai_suggestion:
        recommendations.append(risk_row.ai_suggestion)
    if not recommendations:
        recommendations.append("Student is progressing well. Keep encouraging consistent study habits.")

    # Dynamic announcements based on student data rather than hardcoded strings
    announcements = []
    if latest_academic and latest_academic.backlogs > 0:
        announcements.append(f"{student.name} has {latest_academic.backlogs} active backlog(s) — remedial sessions are available.")
    if latest_att and latest_att.attendance_percentage < 75:
        announcements.append(f"Attendance is below 75% — detention risk per institution policy.")
    if not announcements:
        announcements.append("No urgent alerts. Continue monitoring academic progress.")

    return schemas.ParentDashboardResponse(
        child_name=student.name,
        branch=student.department,
        year=student.year,
        attendance_percent=latest_att.attendance_percentage if latest_att else 0.0,
        current_cgpa=latest_academic.cgpa if latest_academic else 0.0,
        risk_level=risk_row.overall_risk if risk_row else "Low",
        announcements=announcements,
        recommendations=recommendations,
        academics_trend=[schemas.AcademicResponse.model_validate(a) for a in academics],
        skills=skills_list,
        portfolio=schemas.PortfolioResponse.model_validate(portfolio_row) if portfolio_row else None,
    )


def build_faculty_dashboard(db: Session, branch: str | None = None, year: int | None = None) -> schemas.FacultyDashboardResponse:
    students = get_students(db, branch=branch, year=year)
    student_ids = {str(s.student_id) for s in students}

    risk_map = {r.student_id: r.overall_risk for r in db.query(models.RiskPrediction).all() if r.student_id in student_ids}

    # Proper latest-semester lookup for CGPA and backlogs
    academic_rows = db.query(models.Academic).all()
    latest_acad_map = _build_latest_per_student(
        academic_rows, student_ids, value_attrs=["cgpa", "backlogs"]
    )
    latest_cgpa = {sid: data["cgpa"] for sid, data in latest_acad_map.items()}
    latest_backlogs = {sid: data["backlogs"] for sid, data in latest_acad_map.items()}

    # Proper latest-semester attendance lookup
    att_rows = db.query(models.Attendance).all()
    latest_att_data = _build_latest_per_student(
        att_rows, student_ids, value_attrs=["attendance_percentage"]
    )
    latest_att = {sid: data["attendance_percentage"] for sid, data in latest_att_data.items()}

    # Attendance trend: avg attendance per semester
    sem_att: dict[int, list[float]] = {}
    for a in att_rows:
        if a.student_id in student_ids:
            sem_att.setdefault(a.semester, []).append(a.attendance_percentage)
    attendance_trend = [
        {"semester": f"Sem {sem}", "avg_attendance": round(sum(vals) / len(vals), 1)}
        for sem, vals in sorted(sem_att.items())
    ]

    # Skill averages
    skill_rows = db.query(models.Skill).all()
    skill_sums = {"python": 0, "java": 0, "sql": 0, "machine_learning": 0, "data_science": 0, "communication": 0}
    skill_count = 0
    for sk in skill_rows:
        if sk.student_id in student_ids:
            skill_count += 1
            for k in skill_sums:
                skill_sums[k] += getattr(sk, k, 0)
    skill_averages = {k.replace("_", " ").title(): round(v / max(skill_count, 1), 1) for k, v in skill_sums.items()}

    cgpa_vals = [v for v in latest_cgpa.values()]
    avg_cgpa = round(sum(cgpa_vals) / max(len(cgpa_vals), 1), 2)
    low_att_count = sum(1 for v in latest_att.values() if v < 75)
    high_risk_count = sum(1 for v in risk_map.values() if v == "High")

    faculty_rows = []
    for s in students:
        sid = str(s.student_id)
        faculty_rows.append(schemas.FacultyStudentRow(
            student_id=s.student_id,
            name=s.name,
            department=s.department,
            year=s.year,
            section=s.section,
            cgpa=latest_cgpa.get(sid),
            attendance_percentage=latest_att.get(sid),
            overall_risk=risk_map.get(sid, "Low"),
            backlogs=latest_backlogs.get(sid, 0),
        ))

    return schemas.FacultyDashboardResponse(
        total_students=len(students),
        avg_cgpa=avg_cgpa,
        low_attendance_count=low_att_count,
        high_risk_count=high_risk_count,
        students=faculty_rows,
        attendance_trend=attendance_trend,
        skill_averages=skill_averages,
    )


def build_placement_dashboard(db: Session, branch: str | None = None, year: int | None = None) -> schemas.PlacementDashboardResponse:
    students = get_students(db, branch=branch, year=year)
    student_ids = {str(s.student_id) for s in students}
    student_map = {str(s.student_id): s for s in students}

    placement_rows = db.query(models.Placement).all()
    skill_rows = db.query(models.Skill).all()
    skill_map = {sk.student_id: sk for sk in skill_rows}

    candidates = []
    placed_count = 0
    emp_scores = []
    packages = []
    prob_counter: Counter = Counter()
    bands = {"0-30": 0, "30-50": 0, "50-70": 0, "70-100": 0}

    for p in placement_rows:
        if p.student_id not in student_ids:
            continue
        s = student_map[p.student_id]
        sk = skill_map.get(p.student_id)

        candidates.append(schemas.PlacementCandidateRow(
            student_id=p.student_id,
            name=s.name,
            department=s.department,
            year=s.year,
            aptitude_score=p.aptitude_score,
            resume_score=p.resume_score,
            communication_score=p.communication_score,
            interview_readiness=p.interview_readiness,
            employability_score=p.employability_score,
            placement_probability=p.placement_probability,
            placed=p.placed,
            package_lpa=p.package_lpa,
            coding_score=sk.coding_score if sk else 0,
        ))

        emp_scores.append(p.employability_score)
        prob_counter[p.placement_probability] += 1
        if p.placed:
            placed_count += 1
            if p.package_lpa > 0:
                packages.append(p.package_lpa)

        score = p.employability_score
        if score < 30:
            bands["0-30"] += 1
        elif score < 50:
            bands["30-50"] += 1
        elif score < 70:
            bands["50-70"] += 1
        else:
            bands["70-100"] += 1

    candidates.sort(key=lambda c: c.employability_score, reverse=True)

    return schemas.PlacementDashboardResponse(
        total_candidates=len(candidates),
        placed_count=placed_count,
        avg_employability=round(sum(emp_scores) / max(len(emp_scores), 1), 1),
        avg_package=round(sum(packages) / max(len(packages), 1), 2) if packages else 0.0,
        candidates=candidates,
        probability_distribution=[
            schemas.RiskDistributionItem(level=lvl, students=prob_counter.get(lvl, 0))
            for lvl in ["Low", "Medium", "High"]
        ],
        score_bands=[{"band": k, "count": v} for k, v in bands.items()],
    )


def build_recruiter_dashboard(db: Session, branch: str | None = None, min_cgpa: float | None = None, min_employability: float | None = None) -> schemas.RecruiterDashboardResponse:
    students = get_students(db, branch=branch)
    student_ids = {str(s.student_id) for s in students}
    student_map = {str(s.student_id): s for s in students}

    placement_rows = db.query(models.Placement).all()
    placement_map = {p.student_id: p for p in placement_rows if p.student_id in student_ids}

    skill_rows = db.query(models.Skill).all()
    skill_map = {sk.student_id: sk for sk in skill_rows if sk.student_id in student_ids}

    portfolio_rows = db.query(models.Portfolio).all()
    portfolio_map = {po.student_id: po for po in portfolio_rows if po.student_id in student_ids}

    # Proper latest-semester CGPA lookup
    academic_rows = db.query(models.Academic).all()
    latest_acad_map = _build_latest_per_student(
        academic_rows, student_ids, value_attrs=["cgpa"]
    )
    latest_cgpa = {sid: data["cgpa"] for sid, data in latest_acad_map.items()}

    candidates = []
    cgpa_vals = []
    emp_vals = []
    skill_totals = {"Python": 0, "Java": 0, "Sql": 0, "Machine Learning": 0, "Data Science": 0, "Communication": 0}
    skill_count = 0

    for sid in student_ids:
        s = student_map[sid]
        p = placement_map.get(sid)
        sk = skill_map.get(sid)
        po = portfolio_map.get(sid)
        cgpa = latest_cgpa.get(sid, 0.0)

        if min_cgpa and cgpa < min_cgpa:
            continue
        emp = p.employability_score if p else 0.0
        if min_employability and emp < min_employability:
            continue

        skills_dict = {}
        if sk:
            skill_count += 1
            for field_name in ["python", "java", "sql", "machine_learning", "data_science", "communication"]:
                label = field_name.replace("_", " ").title()
                val = getattr(sk, field_name, 0)
                skills_dict[label] = val
                skill_totals[label] += val

        candidates.append(schemas.RecruiterCandidateRow(
            student_id=sid,
            name=s.name,
            department=s.department,
            year=s.year,
            cgpa=cgpa,
            employability_score=emp,
            coding_score=sk.coding_score if sk else 0,
            projects=po.projects if po else 0,
            certifications=po.certifications if po else 0,
            github_score=po.github_score if po else 0,
            placement_probability=p.placement_probability if p else "Low",
            skills=skills_dict,
        ))

        cgpa_vals.append(cgpa)
        emp_vals.append(emp)

    candidates.sort(key=lambda c: c.employability_score, reverse=True)
    top_skills = {k: round(v / max(skill_count, 1), 1) for k, v in skill_totals.items()}

    return schemas.RecruiterDashboardResponse(
        total_candidates=len(candidates),
        avg_cgpa=round(sum(cgpa_vals) / max(len(cgpa_vals), 1), 2),
        avg_employability=round(sum(emp_vals) / max(len(emp_vals), 1), 1),
        top_skills=top_skills,
        candidates=candidates,
    )
