import uuid
from datetime import date, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import ensure_owned_group, ensure_own_student, require_student, require_teacher
from app.db.session import get_db
from app.models import Group, GroupMember, StudentOfTheDay, User, WeeklyGoal
from app.schemas.engagement import GoalCreate, SOTDCreate
from app.services.activity import log_activity
from app.services.goals import goal_out, goal_progress
from app.services.push import send_push_to_users
from app.services.serializers import sotd_out
from app.services.timeutils import today_local, week_start_for

router = APIRouter(prefix="/teacher", tags=["engagement"])
student_router = APIRouter(prefix="/student", tags=["engagement"])


@router.get("/student-of-the-day", response_model=list[dict])
def sotd_history(
    limit: int = Query(default=14, ge=1, le=60),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    rows = (
        db.execute(
            select(StudentOfTheDay)
            .where(StudentOfTheDay.teacher_id == teacher.id)
            .options(
                selectinload(StudentOfTheDay.student).selectinload(User.membership).selectinload(GroupMember.group)
            )
            .order_by(StudentOfTheDay.awarded_on.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return [sotd_out(entry) for entry in rows]


@router.post("/student-of-the-day", response_model=dict)
def set_sotd(
    payload: SOTDCreate,
    background: BackgroundTasks,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    try:
        student_id = uuid.UUID(payload.student_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Noto'g'ri o'quvchi ID")
    student = ensure_own_student(db, teacher, student_id)
    awarded_on = payload.awarded_on or today_local()
    if awarded_on > today_local():
        raise HTTPException(status_code=400, detail="Kelajak sana uchun tanlov qilib bo'lmaydi")

    entry = db.execute(
        select(StudentOfTheDay).where(
            StudentOfTheDay.teacher_id == teacher.id,
            StudentOfTheDay.awarded_on == awarded_on,
        )
    ).scalar_one_or_none()
    if entry:
        entry.student_id = student.id
        entry.note = payload.note
    else:
        entry = StudentOfTheDay(
            teacher_id=teacher.id,
            student_id=student.id,
            awarded_on=awarded_on,
            note=payload.note,
        )
        db.add(entry)
    log_activity(
        db,
        student.id,
        "student_of_the_day",
        f"Kunning eng faol o'quvchisi tanlandi ({awarded_on.strftime('%d.%m.%Y')})",
        {"date": awarded_on.isoformat()},
        actor_id=teacher.id,
    )
    db.commit()
    db.refresh(entry)
    background.add_task(
        send_push_to_users,
        [student.id],
        "Kunning o'quvchisi ⭐",
        "Bugun siz tanlandingiz!",
        "/student",
        "sotd",
    )
    return sotd_out(entry)


@student_router.get("/student-of-the-day", response_model=dict | None)
def my_sotd(student: User = Depends(require_student), db: Session = Depends(get_db)):
    entry = db.execute(
        select(StudentOfTheDay)
        .where(
            StudentOfTheDay.student_id == student.id,
            StudentOfTheDay.awarded_on == today_local(),
        )
        .options(selectinload(StudentOfTheDay.student))
    ).scalar_one_or_none()
    if entry is None:
        return None
    entry.student = student
    return sotd_out(entry)


@router.get("/goals", response_model=list[dict])
def list_goals(
    week_start: date | None = None,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    week = week_start or week_start_for()
    rows = (
        db.execute(
            select(WeeklyGoal)
            .where(WeeklyGoal.teacher_id == teacher.id, WeeklyGoal.week_start == week)
            .options(selectinload(WeeklyGoal.group), selectinload(WeeklyGoal.student))
            .order_by(WeeklyGoal.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [goal_out(goal) for goal in rows]


@router.post("/goals", response_model=dict, status_code=201)
def create_goal(
    payload: GoalCreate,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if bool(payload.student_id) == bool(payload.group_id):
        raise HTTPException(
            status_code=400, detail="Maqsad bitta o'quvchi yoki bitta guruh uchun bo'lishi kerak"
        )
    student = group = None
    if payload.student_id:
        try:
            student = ensure_own_student(db, teacher, uuid.UUID(payload.student_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Noto'g'ri o'quvchi ID")
    if payload.group_id:
        try:
            group = ensure_owned_group(db, teacher, uuid.UUID(payload.group_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Noto'g'ri guruh ID")

    week = payload.week_start or week_start_for()
    existing = db.execute(
        select(WeeklyGoal).where(
            WeeklyGoal.week_start == week,
            WeeklyGoal.metric == payload.metric,
            WeeklyGoal.student_id == (student.id if student else None),
            WeeklyGoal.group_id == (group.id if group else None),
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Bu hafta uchun shunday maqsad allaqachon bor")

    goal = WeeklyGoal(
        teacher_id=teacher.id,
        student_id=student.id if student else None,
        group_id=group.id if group else None,
        title=payload.title.strip(),
        metric=payload.metric,
        target_value=payload.target_value,
        week_start=week,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    goal.student = student
    goal.group = group
    return goal_out(goal)


@router.delete("/goals/{goal_id}", response_model=dict)
def delete_goal(
    goal_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    goal = db.get(WeeklyGoal, goal_id)
    if goal is None or goal.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Maqsad topilmadi")
    db.delete(goal)
    db.commit()
    return {"message": "Maqsad o'chirildi"}


@student_router.get("/goals", response_model=list[dict])
def my_goals(student: User = Depends(require_student), db: Session = Depends(get_db)):
    membership = db.execute(
        select(GroupMember).where(GroupMember.user_id == student.id)
    ).scalar_one_or_none()
    group_id = membership.group_id if membership else None
    week = week_start_for()
    scope = WeeklyGoal.student_id == student.id
    if group_id is not None:
        scope = scope | (WeeklyGoal.group_id == group_id)
    rows = (
        db.execute(
            select(WeeklyGoal)
            .where(
                WeeklyGoal.week_start == week,
                WeeklyGoal.teacher_id == student.teacher_id,
                scope,
            )
            .options(selectinload(WeeklyGoal.group), selectinload(WeeklyGoal.student))
            .order_by(WeeklyGoal.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [goal_out(goal, goal_progress(db, goal, student.id)) for goal in rows]
