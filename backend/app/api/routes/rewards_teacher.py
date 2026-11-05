import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_teacher
from app.db.session import get_db
from app.models import Reward, RewardRequest, RewardRequestStatus, User
from app.schemas.common import Message
from app.schemas.reward import RewardUpdate
from app.services.activity import log_activity
from app.services.coins import apply_coin_transaction
from app.services.files import delete_key, save_image
from app.services.serializers import request_out, reward_out

router = APIRouter(prefix="/teacher", tags=["rewards"])


@router.get("/rewards", response_model=list[dict])
def list_rewards(
    include_archived: bool = False,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    stmt = select(Reward).where(Reward.teacher_id == teacher.id).order_by(Reward.created_at.desc())
    if not include_archived:
        stmt = stmt.where(Reward.is_archived.is_(False))
    rewards = db.execute(stmt).scalars().all()
    counts = dict(
        db.execute(
            select(RewardRequest.reward_id, func.count(RewardRequest.id))
            .where(RewardRequest.status == RewardRequestStatus.pending.value)
            .group_by(RewardRequest.reward_id)
        ).all()
    )
    return [reward_out(r, pending_count=int(counts.get(r.id, 0))) for r in rewards]


@router.post("/rewards", response_model=dict, status_code=201)
def create_reward(
    title: str = Form(..., min_length=2, max_length=150),
    description: str = Form(default=""),
    price: int = Form(..., ge=1, le=1000000),
    is_available: bool = Form(default=True),
    image: UploadFile | None = File(default=None),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    image_key = None
    if image is not None and image.filename:
        image_key, _ = save_image(image, "rewards")
    reward = Reward(
        teacher_id=teacher.id,
        title=" ".join(title.split()),
        description=description.strip(),
        price=price,
        is_available=is_available,
        image_key=image_key,
    )
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward_out(reward, pending_count=0)


@router.patch("/rewards/{reward_id}", response_model=dict)
def update_reward(
    reward_id: uuid.UUID,
    payload: RewardUpdate,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    reward = db.get(Reward, reward_id)
    if reward is None or reward.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Sovg'a topilmadi")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reward, field, value)
    db.commit()
    db.refresh(reward)
    return reward_out(reward)


@router.post("/rewards/{reward_id}/image", response_model=dict)
def update_reward_image(
    reward_id: uuid.UUID,
    image: UploadFile = File(...),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    reward = db.get(Reward, reward_id)
    if reward is None or reward.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Sovg'a topilmadi")
    old_key = reward.image_key
    reward.image_key, _ = save_image(image, "rewards")
    db.commit()
    delete_key(old_key)
    return reward_out(reward)


@router.delete("/rewards/{reward_id}", response_model=Message)
def delete_reward(
    reward_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    reward = db.get(Reward, reward_id)
    if reward is None or reward.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Sovg'a topilmadi")
    request_count = int(
        db.execute(
            select(func.count(RewardRequest.id)).where(RewardRequest.reward_id == reward.id)
        ).scalar()
        or 0
    )
    if request_count:
        reward.is_archived = True
        reward.is_available = False
        db.commit()
        return Message(message="Sovg'a arxivlandi (so'rovlar tarixi saqlanadi)")
    image_key = reward.image_key
    db.delete(reward)
    db.commit()
    delete_key(image_key)
    return Message(message="Sovg'a o'chirildi")


@router.get("/reward-requests", response_model=list[dict])
def list_requests(
    status_filter: str | None = None,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    stmt = (
        select(RewardRequest, User, Reward)
        .join(User, User.id == RewardRequest.student_id)
        .join(Reward, Reward.id == RewardRequest.reward_id)
        .where(RewardRequest.teacher_id == teacher.id)
        .order_by(RewardRequest.requested_at.desc())
    )
    if status_filter in {s.value for s in RewardRequestStatus}:
        stmt = stmt.where(RewardRequest.status == status_filter)
    rows = db.execute(stmt).all()
    return [request_out(request, student, reward) for request, student, reward in rows]


@router.post("/reward-requests/{request_id}/approve", response_model=dict)
def approve_request(
    request_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    request = db.execute(
        select(RewardRequest).where(RewardRequest.id == request_id).with_for_update()
    ).scalar_one_or_none()
    if request is None or request.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="So'rov topilmadi")
    if request.status != RewardRequestStatus.pending.value:
        raise HTTPException(status_code=409, detail="Bu so'rov allaqachon ko'rib chiqilgan")
    request.status = RewardRequestStatus.approved.value
    request.resolved_at = datetime.now(timezone.utc)
    request.resolved_by_id = teacher.id
    log_activity(
        db,
        request.student_id,
        "reward_approved",
        f"Sovg'a so'rovi tasdiqlandi: {request.reward.title}",
        {"reward_request_id": str(request.id)},
        actor_id=teacher.id,
    )
    db.commit()
    db.refresh(request)
    return request_out(request)


@router.post("/reward-requests/{request_id}/reject", response_model=dict)
def reject_request(
    request_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    request = db.execute(
        select(RewardRequest).where(RewardRequest.id == request_id).with_for_update()
    ).scalar_one_or_none()
    if request is None or request.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="So'rov topilmadi")
    if request.status != RewardRequestStatus.pending.value:
        raise HTTPException(status_code=409, detail="Bu so'rov allaqachon ko'rib chiqilgan")
    if request.refunded_at is not None:
        raise HTTPException(status_code=409, detail="Coin allaqachon qaytarilgan")

    apply_coin_transaction(
        db,
        student_id=request.student_id,
        amount=request.price_snapshot,
        tx_type="reward_refund",
        reason=f"Sovg'a rad etildi: {request.reward.title}",
        actor_id=teacher.id,
        reward_request_id=request.id,
    )
    request.refunded_at = datetime.now(timezone.utc)
    request.status = RewardRequestStatus.rejected.value
    request.resolved_at = request.refunded_at
    request.resolved_by_id = teacher.id
    log_activity(
        db,
        request.student_id,
        "reward_rejected",
        f"Sovg'a so'rovi rad etildi: {request.reward.title}. {request.price_snapshot} coin qaytarildi",
        {"reward_request_id": str(request.id)},
        actor_id=teacher.id,
    )
    db.commit()
    db.refresh(request)
    return request_out(request)
