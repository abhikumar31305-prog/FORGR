from datetime import datetime, timedelta, timezone
import os
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from fastapi import HTTPException, status
from jose import JWTError, jwt


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("FORGR_SECRET_KEY", "forgr-dev-only-secret")
if SECRET_KEY == "forgr-dev-only-secret":
    import warnings
    warnings.warn(
        "⚠️  FORGR_SECRET_KEY is not set — using insecure default. "
        "Set the FORGR_SECRET_KEY environment variable for production deployments.",
        stacklevel=2,
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("FORGR_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("FORGR_REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


def _create_token(payload: dict, expires_delta: timedelta, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    claims = payload.copy()
    claims.update(
        {
            "iat": int(now.timestamp()),
            "exp": int((now + expires_delta).timestamp()),
            "type": token_type,
        }
    )
    return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(payload: dict) -> str:
    return _create_token(payload, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "access")


def create_refresh_token(payload: dict) -> str:
    return _create_token(payload, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.") from exc

    if payload.get("type") != expected_type:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    return payload