from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_teacher
from app.db.session import get_db
from app.models import (
    ActivityLog,
    Assignment,
    CoinTransaction,
    Group,
    Reward,
    RewardRequest,
    RewardRequestStatus,
    StudentOfTheDay,
    User,
)
from app.services.activity import active_student_count
from app.services.ranking import leaderboard, weekly_champion
from app.services.serializers import iso, request_out, sotd_out, tx_out
from app.services.timeutils import today_local

router = APIRouter(prefix="/teacher", tags=["teacher-dashboard"])


@router.get("/dashboard", response_model=dict)
def dashboard(teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    students_count = int(
        db.execute(
            select(func.count(User.id)).where(
                User.teacher_id == teacher.id, User.role == "student", User.is_active.is_(True)
            )
        ).scalar()
        or 0
    )
    groups_count = int(
        db.execute(select(func.count(Group.id)).where(Group.teacher_id == teacher.id)).scalar() or 0
    )
    assignments_count = int(
        db.execute(
            select(func.count(Assignment.id)).where(Assignment.teacher_id == teacher.id)
        ).scalar()
        or 0
    )
    coins_given = int(
        db.execute(
            select(func.coalesce(func.sum(CoinTransaction.amount), 0))
            .join(User, User.id == CoinTransaction.student_id)
            .where(User.teacher_id == teacher.id, CoinTransaction.type.in_(["award", "deduction"]))
        ).scalar()
        or 0
    )
    pending_requests_count = int(
        db.execute(
            select(func.count(RewardRequest.id)).where(
                RewardRequest.teacher_id == teacher.id,
                RewardRequest.status == RewardRequestStatus.pending.value,
            )
        ).scalar()
        or 0
    )

    pending_requests = db.execute(
        select(RewardRequest, Reward, User)
        .join(Reward, Reward.id == RewardRequest.reward_id)
        .join(User, User.id == RewardRequest.student_id)
        .where(
            RewardRequest.teacher_id == teacher.id,
            RewardRequest.status == RewardRequestStatus.pending.value,
        )
        .order_by(RewardRequest.requested_at.asc())
        .limit(5)
    ).all()

    activity = db.execute(
        select(ActivityLog, User)
        .join(User, User.id == ActivityLog.user_id)
        .where(User.teacher_id == teacher.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
    ).all()

    sotd = db.execute(
        select(StudentOfTheDay)
        .where(StudentOfTheDay.teacher_id == teacher.id, StudentOfTheDay.awarded_on == today_local())
        .limit(1)
    ).scalar_one_or_none()

    return {
        "stats": {
            "students": students_count,
            "groups": groups_count,
            "assignments": assignments_count,
            "coins_given": coins_given,
            "pending_reward_requests": pending_requests_count,
            "weekly_active_students": active_student_count(db, teacher.id),
        },
        "weekly_champion": weekly_champion(db, teacher.id),
        "student_of_the_day": sotd_out(sotd) if sotd else None,
        "top_students": leaderboard(db, teacher.id, "week", limit=5),
        "recent_activity": [
            {
                "id": str(a.id),
                "type": a.type,
                "title": a.title,
                "student_name": student.full_name,
                "created_at": iso(a.created_at),
            }
            for a, student in activity
        ],
        "pending_reward_requests": [
            request_out(request, student, reward) for request, reward, student in pending_requests
        ],
    }


@router.get("/coins/recent", response_model=list[dict])
def recent_coins(
    limit: int = 20, teacher: User = Depends(require_teacher), db: Session = Depends(get_db)
):
    rows = db.execute(
        select(CoinTransaction, User)
        .join(User, User.id == CoinTransaction.student_id)
        .where(User.teacher_id == teacher.id)
        .order_by(CoinTransaction.created_at.desc())
        .limit(min(limit, 100))
    ).all()
    return [
        {**tx_out(tx), "student_name": student.full_name} for tx, student in rows
    ]
