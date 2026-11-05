import uuid
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.models import ActivityLog, User
from app.services.timeutils import APP_TZ, today_local


def log_activity(
    db: Session,
    user_id: uuid.UUID,
    type_: str,
    title: str,
    meta: dict[str, Any] | None = None,
    actor_id: uuid.UUID | None = None,
) -> ActivityLog:
    entry = ActivityLog(
        user_id=user_id, actor_id=actor_id, type=type_, title=title, meta=meta or {}
    )
    db.add(entry)
    return entry


def get_streak(db: Session, user_id: uuid.UUID, today: date | None = None) -> dict[str, Any]:
    """Streak = consecutive local days with at least one recorded activity."""
    today = today or today_local()
    since = today - timedelta(days=180)
    rows = db.execute(
        select(ActivityLog.created_at).where(
            ActivityLog.user_id == user_id, ActivityLog.created_at >= since
        )
    ).scalars()
    active_days = {row.astimezone(APP_TZ).date() for row in rows}
    cursor = today if today in active_days else today - timedelta(days=1)
    streak = 0
    counted: list[date] = []
    while cursor in active_days:
        streak += 1
        counted.append(cursor)
        cursor -= timedelta(days=1)
    return {
        "current": streak,
        "active_today": today in active_days,
        "days": [d.isoformat() for d in counted],
    }


def weekly_activity(db: Session, user_id: uuid.UUID) -> list[dict[str, Any]]:
    """Last 7 local days activity counts (for the small chart)."""
    today = today_local()
    since = today - timedelta(days=6)
    rows = db.execute(
        select(ActivityLog.created_at).where(
            ActivityLog.user_id == user_id, ActivityLog.created_at >= since
        )
    ).scalars()
    counts = {since + timedelta(days=i): 0 for i in range(7)}
    for row in rows:
        day = row.astimezone(APP_TZ).date()
        if day in counts:
            counts[day] += 1
    return [{"date": d.isoformat(), "count": counts[d]} for d in counts]


def active_student_count(db: Session, teacher_id: uuid.UUID, days: int = 7) -> int:
    since = today_local() - timedelta(days=days - 1)
    stmt = (
        select(func.count(distinct(ActivityLog.user_id)))
        .join(User, User.id == ActivityLog.user_id)
        .where(User.teacher_id == teacher_id, ActivityLog.created_at >= since)
    )
    return int(db.execute(stmt).scalar() or 0)
