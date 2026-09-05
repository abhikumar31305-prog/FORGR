"""Notification boundary for email and in-app delivery providers."""

import logging
import os

logger = logging.getLogger("forgr.notifications")


def send_notification(recipient: str, subject: str, message: str) -> None:
    """Log notifications until an SMTP/provider adapter is configured."""
    provider = os.getenv("FORGR_NOTIFICATION_PROVIDER", "log")
    if provider == "log":
        logger.info("notification_queued", extra={"recipient": recipient, "subject": subject})
        return
    raise RuntimeError(f"Unsupported notification provider: {provider}")
