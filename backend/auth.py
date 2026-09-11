from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import SessionLocal
from security import create_access_token, create_refresh_token, decode_token

# Swagger / Bearer scheme
bearer_scheme = HTTPBearer(auto_error=False)


def _role_value(role: object) -> str:
    val = role.value if hasattr(role, "value") else str(role)
    return str(val).lower()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _display_name_for_user(db: Session, user: models.User) -> str:
    if _role_value(user.role) == models.UserRole.ADMIN.value:
        return "FORGR Admin"

    if user.linked_profile_id is None:
        return user.email.split("@")[0].replace(".", " ").title()

    student = db.query(models.Student).filter(models.Student.id == user.linked_profile_id).first()
    if student is None:
        return user.email.split("@")[0].replace(".", " ").title()

    if _role_value(user.role) == models.UserRole.PARENT.value:
        return f"Parent of {student.name}"

    return student.name


def _student_for_user(db: Session, user: models.User) -> models.Student | None:
    if user.linked_profile_id is not None:
        student = db.query(models.Student).filter(models.Student.id == user.linked_profile_id).first()
        if student is not None:
            return student
    if _role_value(user.role) == "student":
        return db.query(models.Student).filter(models.Student.email == user.email).first()
    return None


def _persist_profile_link(db: Session, user: models.User, student: models.Student) -> None:
    if user.linked_profile_id == student.id:
        return
    user.linked_profile_id = student.id
    try:
        db.commit()
    except Exception:
        db.rollback()


def build_user_response(db: Session, user: models.User) -> schemas.AuthUserResponse:
    student = _student_for_user(db, user)
    if student is not None:
        _persist_profile_link(db, user, student)

    return schemas.AuthUserResponse(
        id=user.id,
        name=_display_name_for_user(db, user),
        email=user.email,
        role=_role_value(user.role),
        linked_profile_id=user.linked_profile_id,
        student_id=student.student_id if student is not None else None,
        created_at=user.created_at,
    )


def issue_token_response(db: Session, user: models.User) -> schemas.LoginResponse:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": _role_value(user.role),
        "user_id": user.id,
        "linked_profile_id": user.linked_profile_id,
    }
    return schemas.LoginResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
        token_type="bearer",
        user=build_user_response(db, user),
    )


def register_user(db: Session, payload: schemas.RegisterRequest) -> schemas.LoginResponse:
    user = crud.create_user(db, payload)
    return issue_token_response(db, user)


def login_user(db: Session, payload: schemas.LoginRequest) -> schemas.LoginResponse:
    user = crud.authenticate_user(db, payload)
    return issue_token_response(db, user)


def refresh_user_tokens(db: Session, refresh_token: str) -> schemas.LoginResponse:
    payload = decode_token(refresh_token, expected_type="refresh")
    user_id = int(payload["sub"])
    user = crud.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    return issue_token_response(db, user)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")

    try:
        payload = decode_token(token, expected_type="access")
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token.")

    user = crud.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    return user


def require_role(*roles: str):
    allowed_roles = {role for role in roles}

    def dependency(current_user: models.User = Depends(get_current_user)) -> models.User:
        current_role = _role_value(current_user.role)
        if current_role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this resource.")
        return current_user

    return dependency


def check_student_access(current_user: models.User, target_student_id: str, db: Session) -> None:
    """
    Enforces Horizontal Privilege Escalation (IDOR) prevention.
    - Admins, Faculty, and Placement Cell can access cohort records.
    - Students can ONLY access their own student records.
    - Parents can ONLY access their linked ward.
    """
    role = _role_value(current_user.role)
    if role in ("admin", "faculty", "placement_cell"):
        return

    if role == "student":
        student = _student_for_user(db, current_user)
        if student is not None:
            _persist_profile_link(db, current_user, student)

        if not student or student.student_id != target_student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only access your own student records.",
            )
        return

    if role == "parent":
        if not current_user.linked_profile_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: No linked student record for this parent account.",
            )
        student = db.query(models.Student).filter(models.Student.id == current_user.linked_profile_id).first()
        if not student or student.student_id != target_student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only access your linked ward's records.",
            )
        return

    if role == "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Recruiters cannot access full academic records directly.",
        )

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
