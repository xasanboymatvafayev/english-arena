import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import ensure_owned_group, require_student, require_teacher
from app.db.session import get_db
from app.models import Announcement, Group, GroupMember, User
from app.schemas.common import Message
from app.schemas.engagement import AnnouncementCreate
from app.services.activity import log_activity
from app.services.serializers import iso

router = APIRouter(prefix="/teacher/announcements", tags=["announcements"])
student_router = APIRouter(prefix="/student/announcements", tags=["announcements"])


def _out(item: Announcement) -> dict:
    return {
        "id": str(item.id),
        "title": item.title,
        "body": item.body,
        "group_id": str(item.group_id) if item.group_id else None,
        "group_name": item.group.name if item.group else "Barcha guruhlar",
        "is_pinned": item.is_pinned,
        "created_at": iso(item.created_at),
    }


@router.get("", response_model=list[dict])
def teacher_list(teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(Announcement)
            .where(Announcement.teacher_id == teacher.id)
            .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [_out(a) for a in rows]


@router.post("", response_model=dict, status_code=201)
def create_announcement(
    payload: AnnouncementCreate,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group = None
    if payload.group_id:
        try:
            group = ensure_owned_group(db, teacher, uuid.UUID(payload.group_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="Noto'g'ri guruh ID")
    announcement = Announcement(
        teacher_id=teacher.id,
        group_id=group.id if group else None,
        title=" ".join(payload.title.split()),
        body=payload.body.strip(),
        is_pinned=payload.is_pinned,
    )
    db.add(announcement)
    db.flush()
    student_ids = db.execute(
        select(User.id).where(User.teacher_id == teacher.id, User.role == "student")
    ).scalars()
    if group:
        student_ids = db.execute(
            select(GroupMember.user_id).where(GroupMember.group_id == group.id)
        ).scalars()
    for student_id in student_ids:
        log_activity(
            db,
            student_id,
            "announcement",
            f"Yangi e'lon: {announcement.title}",
            {"announcement_id": str(announcement.id)},
            actor_id=teacher.id,
        )
    db.commit()
    db.refresh(announcement)
    return _out(announcement)


@router.delete("/{announcement_id}", response_model=Message)
def delete_announcement(
    announcement_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    item = db.get(Announcement, announcement_id)
    if item is None or item.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="E'lon topilmadi")
    db.delete(item)
    db.commit()
    return Message(message="E'lon o'chirildi")


@student_router.get("", response_model=list[dict])
def student_list(student: User = Depends(require_student), db: Session = Depends(get_db)):
    membership = db.execute(
        select(GroupMember).where(GroupMember.user_id == student.id)
    ).scalar_one_or_none()
    group_id = membership.group_id if membership else None
    stmt = (
        select(Announcement)
        .where(
            Announcement.teacher_id == student.teacher_id,
            or_(Announcement.group_id.is_(None), Announcement.group_id == group_id),
        )
        .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        .limit(50)
    )
    rows = db.execute(stmt).scalars().all()
    return [_out(a) for a in rows]
