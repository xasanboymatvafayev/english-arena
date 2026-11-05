from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_student
from app.db.session import get_db
from app.models import ActivityLog, CoinTransaction, Group, GroupMember, SavedWord, User
from app.services.activity import get_streak, weekly_activity
from app.services.serializers import iso, tx_out, user_out

router = APIRouter(prefix="/student", tags=["student-account"])


def _group(db: Session, student: User) -> Group | None:
    return db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == student.id)
    ).scalar_one_or_none()


@router.get("/profile", response_model=dict)
def profile(student: User = Depends(require_student), db: Session = Depends(get_db)):
    saved_count = int(
        db.execute(select(func.count(SavedWord.id)).where(SavedWord.student_id == student.id)).scalar()
        or 0
    )
    return {
        "student": user_out(student, _group(db, student)),
        "saved_words_count": saved_count,
        "streak": get_streak(db, student.id),
    }


@router.get("/coins", response_model=dict)
def my_coins(
    limit: int = Query(default=100, ge=1, le=300),
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(CoinTransaction, User)
        .outerjoin(User, User.id == CoinTransaction.created_by_id)
        .where(CoinTransaction.student_id == student.id)
        .order_by(CoinTransaction.created_at.desc())
        .limit(limit)
    ).all()
    earned = int(
        db.execute(
            select(func.coalesce(func.sum(CoinTransaction.amount), 0)).where(
                CoinTransaction.student_id == student.id, CoinTransaction.type == "award"
            )
        ).scalar()
        or 0
    )
    return {
        "balance": student.coin_balance,
        "total_earned": earned,
        "transactions": [
            tx_out(tx, actor.full_name if actor else None) for tx, actor in rows
        ],
    }


@router.get("/activity", response_model=dict)
def my_activity(
    limit: int = Query(default=50, ge=1, le=200),
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    rows = (
        db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == student.id)
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return {
        "streak": get_streak(db, student.id),
        "weekly": weekly_activity(db, student.id),
        "items": [
            {
                "id": str(a.id),
                "type": a.type,
                "title": a.title,
                "meta": a.meta,
                "created_at": iso(a.created_at),
            }
            for a in rows
        ],
    }
