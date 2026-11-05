import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models import CoinTransaction, Group, GroupMember, User
from app.services.timeutils import period_bounds


def _base_query(teacher_id: uuid.UUID, start: datetime | None, end: datetime | None, group_id=None):
    join_conditions = [
        CoinTransaction.student_id == User.id,
        CoinTransaction.type == "award",
    ]
    if start is not None:
        join_conditions.append(CoinTransaction.created_at >= start)
    if end is not None:
        join_conditions.append(CoinTransaction.created_at < end)

    coins = func.coalesce(func.sum(CoinTransaction.amount), 0).label("coins")
    stmt = (
        select(
            User.id,
            User.first_name,
            User.last_name,
            Group.id.label("group_id"),
            Group.name.label("group_name"),
            coins,
        )
        .select_from(User)
        .outerjoin(CoinTransaction, and_(*join_conditions))
        .outerjoin(GroupMember, GroupMember.user_id == User.id)
        .outerjoin(Group, Group.id == GroupMember.group_id)
        .where(User.role == "student", User.is_active.is_(True), User.teacher_id == teacher_id)
        .group_by(User.id, User.first_name, User.last_name, Group.id, Group.name)
        .order_by(coins.desc(), User.first_name.asc(), User.last_name.asc())
    )
    if group_id:
        stmt = stmt.where(Group.id == group_id)
    return stmt


def leaderboard(
    db: Session,
    teacher_id: uuid.UUID,
    period: str = "week",
    group_id: uuid.UUID | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    start, end = period_bounds(period)
    rows = db.execute(_base_query(teacher_id, start, end, group_id)).all()
    result = []
    for index, row in enumerate(rows, start=1):
        result.append(
            {
                "rank": index,
                "student_id": str(row.id),
                "first_name": row.first_name,
                "last_name": row.last_name,
                "full_name": f"{row.first_name} {row.last_name}".strip(),
                "group_id": str(row.group_id) if row.group_id else None,
                "group_name": row.group_name,
                "coins": int(row.coins),
            }
        )
    return result[:limit]


def rank_of(rows: list[dict[str, Any]], student_id: str) -> dict[str, Any] | None:
    for row in rows:
        if row["student_id"] == student_id:
            return row
    return None


def weekly_champion(db: Session, teacher_id: uuid.UUID) -> dict[str, Any] | None:
    rows = leaderboard(db, teacher_id, period="week", limit=1)
    if rows and rows[0]["coins"] > 0:
        return rows[0]
    return None
