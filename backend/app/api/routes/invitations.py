import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.deps import ensure_owned_group, require_teacher
from app.db.session import get_db
from app.models import Group, Invitation, InvitationStatus, User
from app.schemas.common import Message
from app.schemas.invitation import InvitationCreate
from app.services.activity import log_activity
from app.services.emailjs import send_invitation_email
from app.services.serializers import invitation_out

router = APIRouter(prefix="/teacher/invitations", tags=["invitations"])


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def invite_link(token: str) -> str:
    return f"{settings.app_url.rstrip('/')}/register?token={token}"


def _expire_stale(db: Session, teacher_id: uuid.UUID) -> None:
    now = datetime.now(timezone.utc)
    stale = (
        db.execute(
            select(Invitation).where(
                Invitation.teacher_id == teacher_id,
                Invitation.status == InvitationStatus.pending.value,
                Invitation.expires_at < now,
            )
        )
        .scalars()
        .all()
    )
    for invitation in stale:
        invitation.status = InvitationStatus.expired.value
    if stale:
        db.commit()


@router.get("", response_model=list[dict])
def list_invitations(
    status_filter: str | None = None,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    _expire_stale(db, teacher.id)
    stmt = (
        select(Invitation)
        .where(Invitation.teacher_id == teacher.id)
        .options(joinedload(Invitation.group))
        .order_by(Invitation.created_at.desc())
    )
    if status_filter in {s.value for s in InvitationStatus}:
        stmt = stmt.where(Invitation.status == status_filter)
    invitations = db.execute(stmt).scalars().all()
    return [invitation_out(i) for i in invitations]


@router.post("", response_model=dict, status_code=201)
def create_invitation(
    payload: InvitationCreate,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group = ensure_owned_group(db, teacher, uuid.UUID(payload.group_id))
    email = payload.email.lower().strip()

    if db.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bu email allaqachon ro'yxatdan o'tgan")

    existing = db.execute(
        select(Invitation)
        .join(Group, Group.id == Invitation.group_id)
        .where(
            func.lower(Invitation.email) == email,
            Group.teacher_id == teacher.id,
            Invitation.status == InvitationStatus.pending.value,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Bu emailga allaqachon kutilayotgan taklif yuborilgan. Ro'yxatdan qayta yuborishingiz mumkin.",
        )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.invitation_expire_days)
    invitation = Invitation(
        teacher_id=teacher.id,
        group_id=group.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=email,
        token_hash=_hash(token),
        status=InvitationStatus.pending.value,
        expires_at=expires_at,
    )
    db.add(invitation)
    db.flush()

    link = invite_link(token)
    result = send_invitation_email(
        to_email=email,
        to_name=payload.first_name,
        teacher_name=teacher.full_name,
        group_name=group.name,
        invite_link=link,
        expires_at=expires_at,
    )
    now = datetime.now(timezone.utc)
    if result.sent:
        invitation.last_sent_at = now
        invitation.email_error = None
        log_activity(
            db,
            teacher.id,
            "invitation_sent",
            f"{payload.first_name} {payload.last_name} ga taklif yuborildi",
            {"group": group.name, "email": email},
        )
    else:
        invitation.email_error = result.error
    db.commit()

    db.refresh(invitation)
    invitation.group = group
    data = invitation_out(invitation, invite_link=link)
    data["email_sent"] = result.sent
    data["email_error"] = result.error
    return data


@router.post("/{invitation_id}/resend", response_model=dict)
def resend_invitation(
    invitation_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    invitation = db.get(Invitation, invitation_id)
    if invitation is None or invitation.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")
    if invitation.status == InvitationStatus.accepted.value:
        raise HTTPException(status_code=409, detail="Taklif allaqachon qabul qilingan")

    token = secrets.token_urlsafe(32)
    invitation.token_hash = _hash(token)
    invitation.status = InvitationStatus.pending.value
    invitation.expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.invitation_expire_days
    )
    invitation.email_error = None
    link = invite_link(token)
    result = send_invitation_email(
        to_email=invitation.email,
        to_name=invitation.first_name,
        teacher_name=teacher.full_name,
        group_name=invitation.group.name,
        invite_link=link,
        expires_at=invitation.expires_at,
    )
    if result.sent:
        invitation.last_sent_at = datetime.now(timezone.utc)
    else:
        invitation.email_error = result.error
    db.commit()
    data = invitation_out(invitation, invite_link=link)
    data["email_sent"] = result.sent
    data["email_error"] = result.error
    return data


@router.delete("/{invitation_id}", response_model=Message)
def revoke_invitation(
    invitation_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    invitation = db.get(Invitation, invitation_id)
    if invitation is None or invitation.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")
    if invitation.status == InvitationStatus.accepted.value:
        raise HTTPException(status_code=409, detail="Qabul qilingan taklifni bekor qilib bo'lmaydi")
    invitation.status = InvitationStatus.revoked.value
    db.commit()
    return Message(message="Taklif bekor qilindi")
