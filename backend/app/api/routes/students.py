import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import ensure_own_student, require_teacher
from app.db.session import get_db
from app.models import (
    ActivityLog,
    Book,
    CoinTransaction,
    Group,
    GroupMember,
    ReadingProgress,
    Reward,
    RewardRequest,
    SavedWord,
    User,
)
from app.services.activity import get_streak, log_activity
from app.services.ranking import leaderboard, rank_of
from app.services.serializers import iso, request_out, tx_out, user_out
from app.services.timeutils import today_local

router = APIRouter(prefix="/teacher/students", tags=["students"])


def student_rows(db: Session, teacher_id: uuid.UUID, search: str | None = None, group_id=None):
    stmt = (
        select(User, Group)
        .outerjoin(GroupMember, GroupMember.user_id == User.id)
        .outerjoin(Group, Group.id == GroupMember.group_id)
        .where(User.teacher_id == teacher_id, User.role == "student")
        .order_by(User.first_name.asc(), User.last_name.asc())
    )
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.first_name).like(term),
                func.lower(User.last_name).like(term),
                func.lower(User.email).like(term),
                func.lower(func.coalesce(User.username, "")).like(term),
            )
        )
    if group_id:
        stmt = stmt.where(Group.id == group_id)
    return db.execute(stmt).all()


@router.get("", response_model=list[dict])
def list_students(
    search: str | None = Query(default=None, max_length=100),
    group_id: uuid.UUID | None = None,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    rows = student_rows(db, teacher.id, search, group_id)
    return [{**user_out(user, group), "streak": get_streak(db, user.id)["current"]} for user, group in rows]


@router.get("/{student_id}", response_model=dict)
def student_detail(
    student_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    student = ensure_own_student(db, teacher, student_id)
    group = db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == student.id)
    ).scalar_one_or_none()

    transactions = (
        db.execute(
            select(CoinTransaction)
            .where(CoinTransaction.student_id == student.id)
            .order_by(CoinTransaction.created_at.desc())
            .limit(25)
        )
        .scalars()
        .all()
    )
    activity = (
        db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == student.id)
            .order_by(ActivityLog.created_at.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )
    progress_rows = db.execute(
        select(ReadingProgress, Book)
        .join(Book, Book.id == ReadingProgress.book_id)
        .where(ReadingProgress.student_id == student.id)
        .order_by(ReadingProgress.last_read_at.desc())
        .limit(10)
    ).all()
    saved_count = int(
        db.execute(select(func.count(SavedWord.id)).where(SavedWord.student_id == student.id)).scalar()
        or 0
    )
    requests = (
        db.execute(
            select(RewardRequest, Reward)
            .join(Reward, Reward.id == RewardRequest.reward_id)
            .where(RewardRequest.student_id == student.id)
            .order_by(RewardRequest.requested_at.desc())
            .limit(10)
        )
        .all()
    )

    ranks = {}
    for period in ("week", "month", "all"):
        rows = leaderboard(db, teacher.id, period)
        ranks[period] = rank_of(rows, str(student.id))

    return {
        "student": user_out(student, group),
        "streak": get_streak(db, student.id),
        "ranks": ranks,
        "transactions": [tx_out(tx) for tx in transactions],
        "activity": [
            {
                "id": str(a.id),
                "type": a.type,
                "title": a.title,
                "meta": a.meta,
                "created_at": iso(a.created_at),
            }
            for a in activity
        ],
        "reading": [
            {
                "book_id": str(book.id),
                "title": book.title,
                "author": book.author,
                "level": book.level,
                "progress_percent": round(progress.progress_percent, 1),
                "last_read_at": iso(progress.last_read_at),
            }
            for progress, book in progress_rows
        ],
        "saved_words_count": saved_count,
        "reward_requests": [request_out(r, reward=reward) for r, reward in requests],
    }


@router.get("/{student_id}/coins", response_model=list[dict])
def student_coins(
    student_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    student = ensure_own_student(db, teacher, student_id)
    rows = db.execute(
        select(CoinTransaction, User)
        .outerjoin(User, User.id == CoinTransaction.created_by_id)
        .where(CoinTransaction.student_id == student.id)
        .order_by(CoinTransaction.created_at.desc())
        .limit(limit)
    ).all()
    return [tx_out(tx, actor.full_name if actor else None) for tx, actor in rows]


@router.get("/{student_id}/activity", response_model=list[dict])
def student_activity(
    student_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=200),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    student = ensure_own_student(db, teacher, student_id)
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
    return [
        {
            "id": str(a.id),
            "type": a.type,
            "title": a.title,
            "meta": a.meta,
            "created_at": iso(a.created_at),
        }
        for a in rows
    ]
