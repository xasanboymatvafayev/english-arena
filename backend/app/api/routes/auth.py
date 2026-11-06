import hashlib
import secrets
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from jose import JWTError
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models import (
    Group,
    GroupMember,
    Invitation,
    InvitationStatus,
    PasswordResetToken,
    User,
    UserRole,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    InviteInfo,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.common import Message
from app.services.activity import log_activity
from app.services.emailjs import send_password_reset_email
from app.services.serializers import user_out
from app.services.timeutils import now_utc

router = APIRouter(prefix="/auth", tags=["auth"])

# Lightweight in-process throttle: 10 failed attempts per 5 minutes per IP+login.
_failed_attempts: dict[str, deque[float]] = defaultdict(deque)
_ATTEMPT_WINDOW = 300
_ATTEMPT_LIMIT = 10


def _throttle_key(request: Request, login_value: str) -> str:
    host = request.client.host if request.client else "unknown"
    return f"{host}:{login_value}"


def hash_invite_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role),
        refresh_token=create_refresh_token(str(user.id)),
    )


def _group_for(db: Session, user: User) -> Group | None:
    if user.role != UserRole.student.value:
        return None
    return db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == user.id)
    ).scalar_one_or_none()


@router.post("/login", response_model=dict)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    identifier = payload.login.strip().lower()
    throttle_key = _throttle_key(request, identifier)
    attempts = _failed_attempts[throttle_key]
    now_ts = time.monotonic()
    while attempts and now_ts - attempts[0] > _ATTEMPT_WINDOW:
        attempts.popleft()
    if len(attempts) >= _ATTEMPT_LIMIT:
        raise HTTPException(
            status_code=429, detail="Juda ko'p urinish. 5 daqiqadan so'ng qayta urinib ko'ring."
        )

    user = db.execute(
        select(User).where(
            or_(func.lower(User.email) == identifier, func.lower(User.username) == identifier)
        )
    ).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        attempts.append(now_ts)
        raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akkaunt bloklangan")
    attempts.clear()

    user.last_login_at = now_utc()
    log_activity(db, user.id, "login", "Platformaga kirdi")
    db.commit()
    group = _group_for(db, user)
    return {**_tokens(user).model_dump(), "user": user_out(user, group)}


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token, expected_type="refresh")
        user = db.get(User, uuid.UUID(data["sub"]))
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Refresh token yaroqsiz")
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")
    return _tokens(user)


@router.get("/me", response_model=dict)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_out(user, _group_for(db, user))


@router.post("/password-reset/request", response_model=Message)
def request_password_reset(
    payload: PasswordResetRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Always return the same message so emails cannot be enumerated."""
    generic = Message(message="Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi.")
    email = payload.email.strip().lower()
    user = db.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        return generic

    now = datetime.now(timezone.utc)
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=settings.password_reset_expire_minutes)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_invite_token(raw_token),
            expires_at=expires_at,
        )
    )
    db.commit()

    reset_link = f"{settings.app_url.rstrip('/')}/reset-password?token={raw_token}"
    background.add_task(
        send_password_reset_email,
        to_email=user.email,
        to_name=user.full_name,
        reset_link=reset_link,
        expires_at=expires_at,
    )
    return generic


@router.post("/password-reset/confirm", response_model=dict)
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    row = db.execute(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == hash_invite_token(payload.token))
        .with_for_update()
    ).scalar_one_or_none()
    if row is None or row.used_at is not None or row.expires_at < now:
        raise HTTPException(status_code=400, detail="Havola yaroqsiz yoki muddati tugagan")

    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="Akkaunt topilmadi yoki bloklangan")

    user.password_hash = hash_password(payload.password)
    row.used_at = now
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    db.commit()
    db.refresh(user)
    group = _group_for(db, user)
    return {**_tokens(user).model_dump(), "user": user_out(user, group)}


@router.post("/change-password", response_model=Message)
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Joriy parol noto'g'ri")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return Message(message="Parol yangilandi")


def _load_invite(db: Session, token: str) -> Invitation:
    invitation = db.execute(
        select(Invitation).where(Invitation.token_hash == hash_invite_token(token))
    ).scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")
    if invitation.status == InvitationStatus.pending.value and invitation.expires_at < datetime.now(timezone.utc):
        invitation.status = InvitationStatus.expired.value
        db.commit()
    return invitation


@router.get("/invitations/{token}", response_model=InviteInfo)
def invitation_info(token: str, db: Session = Depends(get_db)):
    invitation = _load_invite(db, token)
    if invitation.status != InvitationStatus.pending.value:
        raise HTTPException(
            status_code=410,
            detail="Bu taklif allaqachon ishlatilgan yoki muddati tugagan",
        )
    return InviteInfo(
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        email=invitation.email,
        group_name=invitation.group.name,
        teacher_name=invitation.teacher.full_name,
        status=invitation.status,
        expires_at=invitation.expires_at.isoformat(),
    )


@router.post("/invitations/{token}/register", response_model=dict)
def register_with_invitation(
    token: str, payload: RegisterRequest, db: Session = Depends(get_db)
):
    invitation = db.execute(
        select(Invitation).where(Invitation.token_hash == hash_invite_token(token)).with_for_update()
    ).scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")
    if invitation.status == InvitationStatus.pending.value and invitation.expires_at < datetime.now(timezone.utc):
        invitation.status = InvitationStatus.expired.value
        db.commit()
        raise HTTPException(status_code=410, detail="Taklif muddati tugagan")
    if invitation.status == InvitationStatus.expired.value:
        raise HTTPException(status_code=410, detail="Taklif muddati tugagan")
    if invitation.status != InvitationStatus.pending.value:
        raise HTTPException(status_code=409, detail="Bu taklif allaqachon ishlatilgan")

    login_value = payload.login.strip().lower()
    email_exists = db.execute(
        select(User).where(
            or_(
                func.lower(User.email) == invitation.email.lower(),
                func.lower(User.username) == login_value,
            )
        )
    ).scalar_one_or_none()
    if email_exists is not None:
        raise HTTPException(status_code=409, detail="Bu email yoki login band")

    student = User(
        role=UserRole.student.value,
        first_name=invitation.first_name,
        last_name=invitation.last_name,
        email=invitation.email.lower(),
        username=login_value,
        password_hash=hash_password(payload.password),
        teacher_id=invitation.teacher_id,
    )
    db.add(student)
    db.flush()

    db.add(GroupMember(group_id=invitation.group_id, user_id=student.id))
    invitation.status = InvitationStatus.accepted.value
    invitation.accepted_at = datetime.now(timezone.utc)
    invitation.student_id = student.id
    log_activity(
        db,
        student.id,
        "account_created",
        f"{invitation.group.name} guruhida akkaunt yaratdi",
        {"group_id": str(invitation.group_id)},
    )
    db.commit()

    # Reload with relationships needed by user_out.
    db.refresh(student)
    group = _group_for(db, student)
    return {**_tokens(student).model_dump(), "user": user_out(student, group)}
