import uuid
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CoinTransaction, ReadingProgress, SavedWord
from app.services.timeutils import local_midnight_to_utc


def goal_progress(db: Session, goal, student_id: uuid.UUID) -> dict:
    start = local_midnight_to_utc(goal.week_start)
    end = local_midnight_to_utc(goal.week_start + timedelta(days=7))
    if goal.metric == "coins":
        value = int(
            db.execute(
                select(func.coalesce(func.sum(CoinTransaction.amount), 0)).where(
                    CoinTransaction.student_id == student_id,
                    CoinTransaction.type == "award",
                    CoinTransaction.created_at >= start,
                    CoinTransaction.created_at < end,
                )
            ).scalar()
            or 0
        )
    elif goal.metric == "books":
        value = int(
            db.execute(
                select(func.count(func.distinct(ReadingProgress.book_id))).where(
                    ReadingProgress.student_id == student_id,
                    ReadingProgress.started_at >= start,
                    ReadingProgress.started_at < end,
                )
            ).scalar()
            or 0
        )
    else:
        value = int(
            db.execute(
                select(func.count(SavedWord.id)).where(
                    SavedWord.student_id == student_id,
                    SavedWord.created_at >= start,
                    SavedWord.created_at < end,
                )
            ).scalar()
            or 0
        )
    percent = min(100.0, round(value / goal.target_value * 100, 1)) if goal.target_value else 0
    return {"value": value, "target": goal.target_value, "percent": percent}


def goal_out(goal, progress: dict | None = None) -> dict:
    return {
        "id": str(goal.id),
        "title": goal.title,
        "metric": goal.metric,
        "target_value": goal.target_value,
        "week_start": goal.week_start.isoformat(),
        "student_id": str(goal.student_id) if goal.student_id else None,
        "group_id": str(goal.group_id) if goal.group_id else None,
        "scope": "student" if goal.student_id else "group",
        "group_name": goal.group.name if goal.group else None,
        "student_name": goal.student.full_name if goal.student else None,
        "progress": progress,
    }
