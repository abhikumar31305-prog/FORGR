from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import SessionLocal
from security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)


# ─────────────────────────────────────────────────────────────
# Swagger / Bearer Authentication
# ─────────────────────────────────────────────────────────────

bearer_scheme = HTTPBearer()


# ─────────────────────────────────────────────────────────────
# Role Helper
# ─────────────────────────────────────────────────────────────

def _role_value(role: object) -> str:
    return role.value if hasattr(role, "value") else str(role)


# ─────────────────────────────────────────────────────────────
# Database Dependency
# ─────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────
# Display Name
# ─────────────────────────────────────────────────────────────

def _display_name_for_user(
    db: Session,
    user: models.User,
) -> str:

    if _role_value(user.role) == models.UserRole.ADMIN.value:
        return "FORGR Admin"

    if user.linked_profile_id is None:
        return (
            user.email
            .split("@")[0]
            .replace(".", " ")
            .title()
        )

    student = (
        db.query(models.Student)
        .filter(
            models.Student.id == user.linked_profile_id
        )
        .first()
    )

    if student is None:
        return (
            user.email
            .split("@")[0]
            .replace(".", " ")
            .title()
        )

    if _role_value(user.role) == models.UserRole.PARENT.value:
        return f"Parent of {student.name}"

    return student.name


# ─────────────────────────────────────────────────────────────
# User Response
# ─────────────────────────────────────────────────────────────

def build_user_response(
    db: Session,
    user: models.User,
) -> schemas.AuthUserResponse:

    student_id = None

    if user.linked_profile_id is not None:

        student = (
            db.query(models.Student)
            .filter(
                models.Student.id == user.linked_profile_id
            )
            .first()
        )

        if student is not None:
            student_id = student.student_id

    return schemas.AuthUserResponse(
        id=user.id,
        name=_display_name_for_user(db, user),
        email=user.email,
        role=_role_value(user.role),
        linked_profile_id=user.linked_profile_id,
        student_id=student_id,
        created_at=user.created_at,
    )


# ─────────────────────────────────────────────────────────────
# Token Response
# ─────────────────────────────────────────────────────────────

def issue_token_response(
    db: Session,
    user: models.User,
) -> schemas.LoginResponse:

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": _role_value(user.role),
        "user_id": user.id,
        "linked_profile_id": user.linked_profile_id,
    }

    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    return schemas.LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=build_user_response(db, user),
    )


# ─────────────────────────────────────────────────────────────
# Register
# ─────────────────────────────────────────────────────────────

def register_user(
    db: Session,
    payload: schemas.RegisterRequest,
) -> schemas.LoginResponse:

    user = crud.create_user(db, payload)

    return issue_token_response(db, user)


# ─────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────

def login_user(
    db: Session,
    payload: schemas.LoginRequest,
) -> schemas.LoginResponse:

    user = crud.authenticate_user(db, payload)

    return issue_token_response(db, user)


# ─────────────────────────────────────────────────────────────
# Refresh Token
# ─────────────────────────────────────────────────────────────

def refresh_user_tokens(
    db: Session,
    refresh_token: str,
) -> schemas.LoginResponse:

    payload = decode_token(
        refresh_token,
        expected_type="refresh",
    )

    user_id = int(payload["sub"])

    user = crud.get_user_by_id(
        db,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return issue_token_response(db, user)


# ─────────────────────────────────────────────────────────────
# Current User
# ─────────────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> models.User:

    # Swagger automatically provides:
    # Authorization: Bearer <token>

    token = credentials.credentials

    try:
        payload = decode_token(
            token,
            expected_type="access",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    user = crud.get_user_by_id(
        db,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return user


# ─────────────────────────────────────────────────────────────
# Role Based Access Control
# ─────────────────────────────────────────────────────────────

def require_role(*roles: str):

    allowed_roles = set(roles)

    def dependency(
        current_user: models.User = Depends(
            get_current_user
        ),
    ) -> models.User:

        current_role = _role_value(
            current_user.role
        )

        if current_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this resource.",
            )

        return current_user

    return dependency