import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.deps import ensure_owned_group, ensure_own_student, require_teacher
from app.db.session import get_db
from app.models import Assignment, Group, GroupMember, User
from app.schemas.common import Message
from app.schemas.group import AddMemberRequest, GroupCreate, GroupUpdate
from app.services.serializers import group_out, user_out

router = APIRouter(prefix="/teacher/groups", tags=["groups"])

ALLOWED_COLORS = {"violet", "emerald", "amber", "sky", "rose", "slate"}


def _member_count(db: Session, group_id: uuid.UUID) -> int:
    return int(
        db.execute(
            select(func.count(GroupMember.id)).where(GroupMember.group_id == group_id)
        ).scalar()
        or 0
    )


@router.get("", response_model=list[dict])
def list_groups(teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    groups = (
        db.execute(
            select(Group)
            .where(Group.teacher_id == teacher.id)
            .options(selectinload(Group.members))
            .order_by(Group.created_at.asc())
        )
        .scalars()
        .all()
    )
    return [group_out(g) for g in groups]


@router.post("", response_model=dict, status_code=201)
def create_group(
    payload: GroupCreate, teacher: User = Depends(require_teacher), db: Session = Depends(get_db)
):
    color = payload.color if payload.color in ALLOWED_COLORS else "violet"
    group = Group(
        teacher_id=teacher.id,
        name=" ".join(payload.name.split()),
        description=payload.description,
        color=color,
    )
    db.add(group)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Bu nomdagi guruh allaqachon mavjud")
    db.refresh(group)
    return group_out(group, 0)


@router.get("/{group_id}", response_model=dict)
def get_group(
    group_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group = ensure_owned_group(db, teacher, group_id)
    members = (
        db.execute(
            select(GroupMember)
            .where(GroupMember.group_id == group.id)
            .options(selectinload(GroupMember.student))
            .order_by(GroupMember.joined_at.asc())
        )
        .scalars()
        .all()
    )
    assignment_count = int(
        db.execute(
            select(func.count(Assignment.id)).where(
                Assignment.group_id == group.id, Assignment.teacher_id == teacher.id
            )
        ).scalar()
        or 0
    )
    return {
        **group_out(group, len(members)),
        "assignment_count": assignment_count,
        "members": [
            {
                **user_out(m.student),
                "joined_at": m.joined_at.isoformat(),
            }
            for m in members
            if m.student is not None
        ],
    }


@router.patch("/{group_id}", response_model=dict)
def update_group(
    group_id: uuid.UUID,
    payload: GroupUpdate,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group = ensure_owned_group(db, teacher, group_id)
    if payload.name is not None:
        group.name = " ".join(payload.name.split())
    if payload.description is not None:
        group.description = payload.description
    if payload.color is not None:
        group.color = payload.color if payload.color in ALLOWED_COLORS else group.color
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Bu nomdagi guruh allaqachon mavjud")
    return group_out(group, _member_count(db, group.id))


@router.delete("/{group_id}", response_model=Message)
def delete_group(
    group_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group = ensure_owned_group(db, teacher, group_id)
    db.delete(group)
    db.commit()
    return Message(message="Guruh o'chirildi. O'quvchilar ustoz ro'yxatida qoldi.")


@router.post("/{group_id}/members", response_model=dict)
def add_member(
    group_id: uuid.UUID,
    payload: AddMemberRequest,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group = ensure_owned_group(db, teacher, group_id)
    try:
        student_id = uuid.UUID(payload.student_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Noto'g'ri o'quvchi ID")
    student = ensure_own_student(db, teacher, student_id)

    existing = db.execute(
        select(GroupMember).where(GroupMember.user_id == student.id)
    ).scalar_one_or_none()
    if existing:
        if existing.group_id == group.id:
            raise HTTPException(status_code=409, detail="O'quvchi allaqachon bu guruhda")
        existing.group_id = group.id
    else:
        db.add(GroupMember(group_id=group.id, user_id=student.id))
    db.commit()
    return {"message": f"{student.full_name} guruhga qo'shildi"}


@router.delete("/{group_id}/members/{student_id}", response_model=Message)
def remove_member(
    group_id: uuid.UUID,
    student_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group = ensure_owned_group(db, teacher, group_id)
    ensure_own_student(db, teacher, student_id)
    membership = db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group.id, GroupMember.user_id == student_id
        )
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=404, detail="O'quvchi bu guruhda emas")
    db.delete(membership)
    db.commit()
    return Message(message="O'quvchi guruhdan chiqarildi")
