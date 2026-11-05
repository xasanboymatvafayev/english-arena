from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import require_student
from app.db.session import get_db
from app.models import (
    Announcement,
    Assignment,
    AssignmentRecipient,
    Book,
    BookFavorite,
    Group,
    GroupMember,
    ReadingProgress,
    SavedWord,
    StudentOfTheDay,
    WeeklyGoal,
    User,
)
from app.services.activity import get_streak, weekly_activity
from app.services.goals import goal_progress
from app.services.ranking import leaderboard, rank_of, weekly_champion
from app.services.serializers import assignment_out, book_out, iso, sotd_out, user_out
from app.services.timeutils import today_local, week_start_for

router = APIRouter(prefix="/student", tags=["student-dashboard"])


@router.get("/dashboard", response_model=dict)
def dashboard(student: User = Depends(require_student), db: Session = Depends(get_db)):
    group = db.execute(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == student.id)
    ).scalar_one_or_none()
    group_id = group.id if group else None

    assignments = db.execute(
        select(Assignment, AssignmentRecipient)
        .join(AssignmentRecipient, AssignmentRecipient.assignment_id == Assignment.id)
        .where(AssignmentRecipient.student_id == student.id)
        .order_by(Assignment.created_at.desc())
        .limit(5)
    ).all()
    new_count = int(
        db.execute(
            select(func.count(AssignmentRecipient.id)).where(
                AssignmentRecipient.student_id == student.id,
                AssignmentRecipient.viewed_at.is_(None),
            )
        ).scalar()
        or 0
    )

    announcement_scope = Announcement.group_id.is_(None)
    if group_id:
        announcement_scope = or_(announcement_scope, Announcement.group_id == group_id)
    announcements = (
        db.execute(
            select(Announcement)
            .where(Announcement.teacher_id == student.teacher_id, announcement_scope)
            .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
            .limit(3)
        )
        .scalars()
        .all()
    )

    progress_rows = db.execute(
        select(ReadingProgress, Book)
        .join(Book, Book.id == ReadingProgress.book_id)
        .where(ReadingProgress.student_id == student.id)
        .order_by(ReadingProgress.last_read_at.desc())
        .limit(5)
    ).all()
    favorite_ids = set(
        db.execute(
            select(BookFavorite.book_id).where(BookFavorite.student_id == student.id)
        ).scalars()
    )

    saved_count = int(
        db.execute(
            select(func.count(SavedWord.id)).where(SavedWord.student_id == student.id)
        ).scalar()
        or 0
    )
    books_started = int(
        db.execute(
            select(func.count(ReadingProgress.id)).where(ReadingProgress.student_id == student.id)
        ).scalar()
        or 0
    )
    books_finished = int(
        db.execute(
            select(func.count(ReadingProgress.id)).where(
                ReadingProgress.student_id == student.id,
                ReadingProgress.progress_percent >= 99,
            )
        ).scalar()
        or 0
    )

    ranks = {
        period: rank_of(leaderboard(db, student.teacher_id, period), str(student.id))
        for period in ("week", "month", "all")
    }

    sotd = db.execute(
        select(StudentOfTheDay).where(
            StudentOfTheDay.student_id == student.id,
            StudentOfTheDay.awarded_on == today_local(),
        )
    ).scalar_one_or_none()
    champion = weekly_champion(db, student.teacher_id)

    goal_scope = WeeklyGoal.student_id == student.id
    if group_id:
        goal_scope = or_(goal_scope, WeeklyGoal.group_id == group_id)
    goals = (
        db.execute(
            select(WeeklyGoal)
            .where(
                WeeklyGoal.week_start == week_start_for(),
                WeeklyGoal.teacher_id == student.teacher_id,
                goal_scope,
            )
            .order_by(WeeklyGoal.created_at.desc())
        )
        .scalars()
        .all()
    )

    return {
        "student": user_out(student, group),
        "stats": {
            "coins": student.coin_balance,
            "saved_words": saved_count,
            "books_started": books_started,
            "books_finished": books_finished,
            "streak": get_streak(db, student.id)["current"],
        },
        "ranks": ranks,
        "badges": {
            "student_of_the_day": sotd_out(sotd) if sotd else None,
            "weekly_champion": champion
            if champion and champion["student_id"] == str(student.id)
            else None,
        },
        "new_assignments_count": new_count,
        "assignments": [
            assignment_out(
                assignment,
                group_name=assignment.group.name if assignment.group else None,
                viewed_at=recipient.viewed_at,
            )
            for assignment, recipient in assignments
        ],
        "announcements": [
            {
                "id": str(a.id),
                "title": a.title,
                "body": a.body,
                "is_pinned": a.is_pinned,
                "created_at": iso(a.created_at),
            }
            for a in announcements
        ],
        "reading": [
            book_out(book, progress=progress, is_favorite=book.id in favorite_ids)
            for progress, book in progress_rows
        ],
        "goals": [
            {
                "id": str(goal.id),
                "title": goal.title,
                "metric": goal.metric,
                "target_value": goal.target_value,
                "week_start": goal.week_start.isoformat(),
                "progress": goal_progress(db, goal, student.id),
            }
            for goal in goals
        ],
        "weekly_activity": weekly_activity(db, student.id),
        "champion": champion,
    }
