"""
FORGR Observability Module

Provides:
- Request context middleware (request_id, user_id, role per request)
- Sentry SDK integration
- Prometheus metrics via prometheus-fastapi-instrumentator
"""

import logging
import os
import time
import contextvars
from uuid import uuid4

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("forgr.observability")

# ── Context Variables ────────────────────────────────────────────────
# These are available to any code running within the same async context.

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")
user_id_var: contextvars.ContextVar[int | None] = contextvars.ContextVar("user_id", default=None)
user_role_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("user_role", default=None)

# ── Process start time for uptime calculation ────────────────────────
_PROCESS_START_TIME = time.time()


def get_uptime_seconds() -> float:
    """Return seconds since the process started."""
    return round(time.time() - _PROCESS_START_TIME, 1)


# ── Request Context Middleware ───────────────────────────────────────


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Attaches request_id, user_id, and user_role to every request context.
    Logs structured request/response entries with timing.
    """

    async def dispatch(self, request: Request, call_next):
        # Generate or extract request_id
        rid = request.headers.get("X-Request-ID", uuid4().hex)
        request_id_var.set(rid)

        # Try to extract user_id and role from JWT (without full auth validation)
        user_id = None
        user_role = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from jose import jwt
                from security import SECRET_KEY, ALGORITHM
                token = auth_header.removeprefix("Bearer ").strip()
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
                user_id = payload.get("user_id")
                user_role = payload.get("role")
            except Exception:
                pass  # Don't block requests if JWT parsing fails

        user_id_var.set(user_id)
        user_role_var.set(user_role)

        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 1)

        # Add request ID to response headers
        response.headers["X-Request-ID"] = rid

        # Log the request with context
        if request.url.path not in ("/health", "/metrics"):
            logger.info(
                "HTTP %s %s → %s (%.1fms)",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                extra={
                    "request_id": rid,
                    "user_id": user_id,
                    "user_role": user_role,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": duration_ms,
                    "client_ip": request.client.host if request.client else None,
                },
            )

        return response


# ── Sentry Integration ───────────────────────────────────────────────


def setup_sentry(app: FastAPI) -> None:
    """
    Initialize Sentry SDK if FORGR_SENTRY_DSN is configured.
    Captures unhandled exceptions with request context.
    """
    dsn = os.getenv("FORGR_SENTRY_DSN")
    if not dsn:
        logger.info("Sentry DSN not configured — skipping Sentry initialization")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        env = os.getenv("FORGR_ENV", "development")
        sentry_sdk.init(
            dsn=dsn,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=float(os.getenv("FORGR_SENTRY_TRACES_RATE", "0.1")),
            environment=env,
            release=os.getenv("FORGR_VERSION", "1.0.0"),
            send_default_pii=False,  # Don't send PII by default
        )
        logger.info("Sentry initialized", extra={"environment": env})
    except ImportError:
        logger.warning("sentry-sdk not installed — Sentry integration disabled")
    except Exception as exc:
        logger.error("Failed to initialize Sentry: %s", exc)


# ── Prometheus Metrics ───────────────────────────────────────────────


def setup_metrics(app: FastAPI) -> None:
    """
    Attach Prometheus metrics instrumentator if available.
    Exposes /metrics endpoint.
    """
    if not os.getenv("FORGR_ENABLE_METRICS", "").lower() in ("1", "true", "yes"):
        logger.info("Prometheus metrics not enabled — set FORGR_ENABLE_METRICS=true to enable")
        return

    try:
        from prometheus_fastapi_instrumentator import Instrumentator

        instrumentator = Instrumentator(
            should_group_status_codes=True,
            should_ignore_untemplated=True,
            should_respect_env_var=False,
            excluded_handlers=["/health", "/metrics"],
            env_var_name="FORGR_ENABLE_METRICS",
        )
        instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
        logger.info("Prometheus metrics enabled at /metrics")
    except ImportError:
        logger.warning("prometheus-fastapi-instrumentator not installed — metrics disabled")
    except Exception as exc:
        logger.error("Failed to setup Prometheus metrics: %s", exc)
