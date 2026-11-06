"""Web Push notifications (VAPID / pywebpush).

VAPID keys are stored as URL-safe base64 strings in environment variables.
The private key is converted to a temporary PEM file for pywebpush, because
the library expects a file path.
"""

import base64
import json
import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Iterable

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import PushSubscription

logger = logging.getLogger("english_arena.push")


def push_configured() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def _vapid_pem_path() -> str | None:
    """Return a path to a PEM private key, decoding the base64 env value."""
    if not settings.vapid_private_key:
        return None
    if settings.vapid_private_key.lstrip().startswith("-----BEGIN"):
        pem = settings.vapid_private_key
    else:
        try:
            raw = base64.urlsafe_b64decode(
                settings.vapid_private_key + "=" * (-len(settings.vapid_private_key) % 4)
            )
            number = int.from_bytes(raw, "big")
            key = ec.derive_private_key(number, ec.SECP256R1())
            pem = key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            ).decode("utf-8")
        except Exception as exc:  # invalid key should not break the app
            logger.error("VAPID private key invalid: %s", exc)
            return None

    path = Path(tempfile.gettempdir()) / "english_arena_vapid.pem"
    path.write_text(pem)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return str(path)


def _remove_expired(db: Session, subscription: PushSubscription) -> None:
    db.delete(subscription)


def send_push_to_users(
    user_ids: Iterable,
    title: str,
    body: str,
    url: str = "/",
    tag: str | None = None,
) -> int:
    """Send a notification to all devices of the given users. Safe when unconfigured."""
    if not push_configured():
        return 0
    ids = list({uuid.UUID(str(item)) for item in user_ids})
    if not ids:
        return 0

    key_path = _vapid_pem_path()
    if not key_path:
        return 0

    db = SessionLocal()
    sent = 0
    try:
        subscriptions = (
            db.execute(select(PushSubscription).where(PushSubscription.user_id.in_(ids)))
            .scalars()
            .all()
        )
        payload = json.dumps(
            {
                "title": title[:120],
                "body": body[:240],
                "url": url,
                "tag": tag or "english-arena",
                "icon": "/icons/icon-192.png",
                "badge": "/icons/icon-192.png",
            },
            ensure_ascii=False,
        )
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                    },
                    data=payload,
                    vapid_private_key=key_path,
                    vapid_claims={"sub": settings.vapid_subject},
                    timeout=10,
                )
                sent += 1
            except WebPushException as exc:
                status = getattr(getattr(exc, "response", None), "status_code", None)
                if status in (404, 410):
                    _remove_expired(db, subscription)
                else:
                    logger.warning("Push failed (%s): %s", status, exc)
            except Exception as exc:  # network errors must never break requests
                logger.warning("Push error: %s", exc)
        db.commit()
    finally:
        db.close()
    return sent
