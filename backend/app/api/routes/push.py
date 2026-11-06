import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import PushSubscription, User
from app.services.push import push_configured, send_push_to_users

router = APIRouter(prefix="/push", tags=["push"])


class SubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=20, max_length=200)
    auth: str = Field(min_length=8, max_length=100)


class SubscriptionIn(BaseModel):
    endpoint: str = Field(min_length=20, max_length=900)
    keys: SubscriptionKeys


@router.get("/public-key", response_model=dict)
def public_key(user: User = Depends(get_current_user)):
    return {
        "enabled": push_configured(),
        "public_key": settings.vapid_public_key if push_configured() else None,
    }


@router.get("/status", response_model=dict)
def status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = int(
        db.execute(
            select(func.count(PushSubscription.id)).where(PushSubscription.user_id == user.id)
        ).scalar()
        or 0
    )
    return {"enabled": push_configured(), "subscriptions": count}


@router.post("/subscribe", response_model=dict, status_code=201)
def subscribe(
    payload: SubscriptionIn,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.endpoint.startswith("https://"):
        raise HTTPException(status_code=400, detail="Push endpoint HTTPS bo'lishi kerak")
    if not push_configured():
        raise HTTPException(status_code=503, detail="Serverda VAPID kalitlari sozlanmagan")

    existing = db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if existing:
        existing.user_id = user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.last_seen_at = now
        existing.user_agent = (request.headers.get("user-agent") or "")[:300]
    else:
        db.add(
            PushSubscription(
                user_id=user.id,
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
                user_agent=(request.headers.get("user-agent") or "")[:300],
                last_seen_at=now,
            )
        )
    db.commit()
    return {"message": "Bildirishnomalar yoqildi"}


@router.delete("/subscribe", response_model=dict)
def unsubscribe(
    endpoint: str = Query(min_length=20, max_length=900),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subscription = db.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == endpoint,
            PushSubscription.user_id == user.id,
        )
    ).scalar_one_or_none()
    if subscription:
        db.delete(subscription)
        db.commit()
    return {"message": "Bildirishnomalar o'chirildi"}


@router.post("/test", response_model=dict)
def send_test(user: User = Depends(get_current_user)):
    sent = send_push_to_users(
        [user.id],
        "English Arena — test",
        "Bildirishnomalar ishlayapti ✅",
        "/",
        "push-test",
    )
    return {"sent": sent}
