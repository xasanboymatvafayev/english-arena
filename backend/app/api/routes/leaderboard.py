from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.services.ranking import leaderboard, rank_of, weekly_champion
from app.services.timeutils import month_start_for, today_local, week_start_for

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=dict)
def get_leaderboard(
    period: str = "week",
    group_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if period not in {"week", "month", "all"}:
        raise HTTPException(status_code=400, detail="Davr week, month yoki all bo'lishi kerak")
    teacher_id = user.id if user.role == "teacher" else user.teacher_id
    if teacher_id is None:
        raise HTTPException(status_code=400, detail="Ustoz biriktirilmagan")

    import uuid as uuid_module

    group_uuid = None
    if group_id:
        try:
            group_uuid = uuid_module.UUID(group_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Noto'g'ri guruh ID")

    rows = leaderboard(db, teacher_id, period, group_uuid)
    me = rank_of(rows, str(user.id)) if user.role == "student" else None
    champion = weekly_champion(db, teacher_id)
    if period == "week":
        period_start = week_start_for().isoformat()
    elif period == "month":
        period_start = month_start_for().isoformat()
    else:
        period_start = None
    return {
        "period": period,
        "period_start": period_start,
        "today": today_local().isoformat(),
        "top": rows[:50],
        "me": me,
        "champion": champion,
    }
