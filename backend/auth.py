from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import SessionLocal
from security import create_access_token, create_refresh_token, decode_token


def _role_value(role: object) -> str:
    return role.value if hasattr(role, "value") else str(role)


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


def build_user_response(db: Session, user: models.User) -> schemas.AuthUserResponse:
    student_id = None
    if user.linked_profile_id is not None:
        student = db.query(models.Student).filter(models.Student.id == user.linked_profile_id).first()
        student_id = student.student_id if student is not None else None

    return schemas.AuthUserResponse(
        id=user.id,
        name=_display_name_for_user(db, user),
        email=user.email,
        role=_role_value(user.role),
        linked_profile_id=user.linked_profile_id,
        student_id=student_id,
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
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_token(token, expected_type="access")
    user_id = int(payload["sub"])

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