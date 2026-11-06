import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_student
from app.db.session import get_db
from app.models import Reward, RewardRequest, RewardRequestStatus, User
from app.services.activity import log_activity
from app.services.coins import apply_coin_transaction
from app.services.push import send_push_to_users
from app.services.serializers import request_out, reward_out

router = APIRouter(prefix="/student/rewards", tags=["rewards"])


@router.get("", response_model=list[dict])
def shop( student: User = Depends(require_student), db: Session = Depends(get_db)):
    rewards = (
        db.execute(
            select(Reward)
            .where(
                Reward.teacher_id == student.teacher_id,
                Reward.is_archived.is_(False),
            )
            .order_by(Reward.price.asc())
        )
        .scalars()
        .all()
    )
    pending_ids = set(
        db.execute(
            select(RewardRequest.reward_id).where(
                RewardRequest.student_id == student.id,
                RewardRequest.status == RewardRequestStatus.pending.value,
            )
        ).scalars()
    )
    result = []
    for reward in rewards:
        data = reward_out(reward)
        data["has_pending_request"] = reward.id in pending_ids
        data["can_request"] = (
            reward.is_available and reward.price <= student.coin_balance and reward.id not in pending_ids
        )
        result.append(data)
    return result


@router.post("/{reward_id}/request", response_model=dict, status_code=201)
def request_reward(
    reward_id: uuid.UUID,
    background: BackgroundTasks,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    reward = db.get(Reward, reward_id)
    if (
        reward is None
        or reward.teacher_id != student.teacher_id
        or reward.is_archived
    ):
        raise HTTPException(status_code=404, detail="Sovg'a topilmadi")
    if not reward.is_available:
        raise HTTPException(status_code=409, detail="Bu sovg'a hozircha mavjud emas")

    duplicate = db.execute(
        select(RewardRequest).where(
            RewardRequest.student_id == student.id,
            RewardRequest.reward_id == reward.id,
            RewardRequest.status == RewardRequestStatus.pending.value,
        )
    ).scalar_one_or_none()
    if duplicate:
        raise HTTPException(status_code=409, detail="Bu sovg'a uchun so'rovingiz ko'rib chiqilmoqda")

    request = RewardRequest(
        reward_id=reward.id,
        student_id=student.id,
        teacher_id=reward.teacher_id,
        price_snapshot=reward.price,
        status=RewardRequestStatus.pending.value,
    )
    db.add(request)
    db.flush()

    apply_coin_transaction(
        db,
        student_id=student.id,
        amount=-reward.price,
        tx_type="reward_spend",
        reason=f"Sovg'a so'rovi: {reward.title}",
        actor_id=student.id,
        reward_request_id=request.id,
    )
    log_activity(
        db,
        student.id,
        "reward_requested",
        f"Sovg'a so'raldi: {reward.title} ({reward.price} coin)",
        {"reward_request_id": str(request.id)},
    )
    db.commit()
    db.refresh(request)
    background.add_task(
        send_push_to_users,
        [reward.teacher_id],
        "Yangi sovg'a so'rovi",
        f"{student.full_name}: {reward.title}",
        "/teacher/rewards",
        "reward-request",
    )
    return request_out(request, student=student, reward=reward)


@router.get("/requests/mine", response_model=list[dict])
def my_requests(student: User = Depends(require_student), db: Session = Depends(get_db)):
    rows = db.execute(
        select(RewardRequest, Reward)
        .join(Reward, Reward.id == RewardRequest.reward_id)
        .where(RewardRequest.student_id == student.id)
        .order_by(RewardRequest.requested_at.desc())
    ).all()
    return [request_out(request, reward=reward) for request, reward in rows]
