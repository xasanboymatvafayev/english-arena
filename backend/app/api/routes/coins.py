import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import ensure_own_student, require_teacher
from app.db.session import get_db
from app.models import CoinTransaction, User
from app.schemas.coin import CoinAdjustRequest
from app.services.activity import log_activity
from app.services.coins import award_or_deduct
from app.services.serializers import tx_out

router = APIRouter(prefix="/teacher/coins", tags=["coins"])


@router.post("", response_model=dict, status_code=201)
def adjust_coins(
    payload: CoinAdjustRequest,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if payload.amount == 0:
        raise HTTPException(status_code=400, detail="Coin miqdori 0 bo'lishi mumkin emas")
    try:
        student_uuid = uuid.UUID(payload.student_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Noto'g'ri o'quvchi ID")
    student = ensure_own_student(db, teacher, student_uuid)

    student, transaction = award_or_deduct(
        db,
        teacher_id=teacher.id,
        student=student,
        amount=payload.amount,
        reason=payload.reason.strip(),
    )
    action = "berildi" if payload.amount > 0 else "ayirildi"
    log_activity(
        db,
        student.id,
        "coins_awarded" if payload.amount > 0 else "coins_deducted",
        f"{abs(payload.amount)} coin {action}: {payload.reason.strip()}",
        {"amount": payload.amount, "transaction_id": str(transaction.id)},
        actor_id=teacher.id,
    )
    db.commit()
    return {
        "balance": student.coin_balance,
        "transaction": tx_out(transaction, teacher.full_name),
    }


@router.get("", response_model=list[dict])
def list_coins(
    student_id: uuid.UUID | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    stmt = (
        select(CoinTransaction, User)
        .join(User, User.id == CoinTransaction.student_id)
        .where(User.teacher_id == teacher.id)
        .order_by(CoinTransaction.created_at.desc())
        .limit(limit)
    )
    if student_id:
        ensure_own_student(db, teacher, student_id)
        stmt = stmt.where(CoinTransaction.student_id == student_id)
    rows = db.execute(stmt).all()
    return [
        {**tx_out(tx, teacher.full_name if tx.created_by_id == teacher.id else None), "student_name": student.full_name}
        for tx, student in rows
    ]
