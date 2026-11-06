import logging
from datetime import datetime

import httpx

from app.core.config import settings

logger = logging.getLogger("english_arena.email")


class EmailResult:
    def __init__(self, sent: bool, error: str | None = None):
        self.sent = sent
        self.error = error


def send_invitation_email(
    *,
    to_email: str,
    to_name: str,
    teacher_name: str,
    group_name: str,
    invite_link: str,
    expires_at: datetime,
) -> EmailResult:
    if not settings.emailjs_configured:
        return EmailResult(
            sent=False,
            error="EmailJS sozlanmagan. EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID va EMAILJS_PUBLIC_KEY ni .env ga kiriting.",
        )

    payload = {
        "service_id": settings.emailjs_service_id,
        "template_id": settings.emailjs_template_id,
        "user_id": settings.emailjs_public_key,
        "accessToken": settings.emailjs_private_key or None,
        "template_params": {
            "to_email": to_email,
            "to_name": to_name,
            "teacher_name": teacher_name,
            "group_name": group_name,
            "invite_link": invite_link,
            "expires_at": expires_at.strftime("%d.%m.%Y %H:%M"),
            "app_name": settings.app_name,
        },
    }
    try:
        with httpx.Client(timeout=15) as client:
            response = client.post(settings.emailjs_api_url, json=payload)
        if response.status_code >= 400:
            logger.warning("EmailJS error %s: %s", response.status_code, response.text[:500])
            return EmailResult(False, f"EmailJS xatosi ({response.status_code}). Sozlamalarni tekshiring.")
        return EmailResult(True)
    except httpx.HTTPError as exc:
        logger.warning("EmailJS request failed: %s", exc)
        return EmailResult(False, "EmailJS serveriga ulanib bo'lmadi.")


def send_password_reset_email(
    *,
    to_email: str,
    to_name: str,
    reset_link: str,
    expires_at: datetime,
) -> EmailResult:
    if not settings.emailjs_reset_configured:
        return EmailResult(
            sent=False,
            error="EmailJS reset template sozlanmagan. EMAILJS_RESET_TEMPLATE_ID ni kiriting.",
        )

    payload = {
        "service_id": settings.emailjs_service_id,
        "template_id": settings.emailjs_reset_template_id,
        "user_id": settings.emailjs_public_key,
        "accessToken": settings.emailjs_private_key or None,
        "template_params": {
            "to_email": to_email,
            "to_name": to_name,
            "reset_link": reset_link,
            "expires_at": expires_at.strftime("%d.%m.%Y %H:%M"),
            "app_name": settings.app_name,
        },
    }
    try:
        with httpx.Client(timeout=15) as client:
            response = client.post(settings.emailjs_api_url, json=payload)
        if response.status_code >= 400:
            logger.warning("EmailJS reset error %s: %s", response.status_code, response.text[:500])
            return EmailResult(False, f"EmailJS xatosi ({response.status_code}). Sozlamalarni tekshiring.")
        return EmailResult(True)
    except httpx.HTTPError as exc:
        logger.warning("EmailJS reset request failed: %s", exc)
        return EmailResult(False, "EmailJS serveriga ulanib bo'lmadi.")
