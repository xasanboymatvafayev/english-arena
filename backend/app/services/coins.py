import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CoinTransaction, CoinTransactionType, User, UserRole


def apply_coin_transaction(
    db: Session,
    *,
    student_id: uuid.UUID,
    amount: int,
    tx_type: str,
    reason: str,
    actor_id: uuid.UUID | None,
    reward_request_id: uuid.UUID | None = None,
) -> tuple[User, CoinTransaction]:
    """Atomically change balance and write history. Caller commits."""
    if amount == 0:
        raise HTTPException(status_code=400, detail="Coin miqdori 0 bo'lishi mumkin emas")
    student = db.execute(
        select(User).where(User.id == student_id).with_for_update()
    ).scalar_one_or_none()
    if student is None or student.role != UserRole.student.value:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")

    new_balance = student.coin_balance + amount
    if new_balance < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Balans yetarli emas. Mavjud balans: {student.coin_balance} coin",
        )
    student.coin_balance = new_balance
    transaction = CoinTransaction(
        student_id=student.id,
        created_by_id=actor_id,
        amount=amount,
        balance_after=new_balance,
        type=tx_type,
        reason=reason[:300],
        reward_request_id=reward_request_id,
    )
    db.add(transaction)
    db.flush()
    return student, transaction


def award_or_deduct(
    db: Session, *, teacher_id: uuid.UUID, student: User, amount: int, reason: str
) -> tuple[User, CoinTransaction]:
    tx_type = CoinTransactionType.award.value if amount > 0 else CoinTransactionType.deduction.value
    return apply_coin_transaction(
        db,
        student_id=student.id,
        amount=amount,
        tx_type=tx_type,
        reason=reason,
        actor_id=teacher_id,
    )
