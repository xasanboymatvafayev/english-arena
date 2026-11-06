import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import ensure_owned_group, ensure_own_student, require_teacher
from app.db.session import get_db
from app.models import Assignment, AssignmentRecipient, Group, GroupMember, User
from app.schemas.common import Message
from app.services.activity import log_activity
from app.services.files import delete_key, save_attachment
from app.services.push import send_push_to_users
from app.services.serializers import assignment_out
from app.services.timeutils import APP_TZ

router = APIRouter(prefix="/teacher/assignments", tags=["assignments"])


def _parse_due(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Muddat formati noto'g'ri")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=APP_TZ)
    return parsed


@router.get("", response_model=list[dict])
def list_assignments(
    teacher: User = Depends(require_teacher), db: Session = Depends(get_db)
):
    rows = db.execute(
        select(Assignment, Group.name, func.count(AssignmentRecipient.id))
        .outerjoin(Group, Group.id == Assignment.group_id)
        .outerjoin(AssignmentRecipient, AssignmentRecipient.assignment_id == Assignment.id)
        .where(Assignment.teacher_id == teacher.id)
        .group_by(Assignment.id, Group.name)
        .order_by(Assignment.created_at.desc())
    ).all()
    return [
        assignment_out(a, group_name=group_name, recipient_count=count)
        for a, group_name, count in rows
    ]


@router.post("", response_model=dict, status_code=201)
def create_assignment(
    background: BackgroundTasks,
    title: str = Form(..., min_length=2, max_length=200),
    description: str = Form(default=""),
    group_id: str | None = Form(default=None),
    student_ids: str | None = Form(default=None),
    due_at: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    group = None
    recipients: set[uuid.UUID] = set()

    if group_id:
        try:
            group_uuid = uuid.UUID(group_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Noto'g'ri guruh ID")
        group = ensure_owned_group(db, teacher, group_uuid)
        member_ids = db.execute(
            select(GroupMember.user_id).where(GroupMember.group_id == group.id)
        ).scalars()
        recipients.update(member_ids)

    if student_ids:
        for raw in student_ids.split(","):
            raw = raw.strip()
            if not raw:
                continue
            try:
                student_id = uuid.UUID(raw)
            except ValueError:
                raise HTTPException(status_code=400, detail="Noto'g'ri o'quvchi ID")
            ensure_own_student(db, teacher, student_id)
            recipients.add(student_id)

    if not recipients:
        raise HTTPException(status_code=400, detail="Kamida bitta o'quvchi tanlanishi kerak")

    attachment = None
    if file is not None and file.filename:
        attachment = save_attachment(file)

    assignment = Assignment(
        teacher_id=teacher.id,
        group_id=group.id if group else None,
        title=" ".join(title.split()),
        description=description.strip(),
        due_at=_parse_due(due_at),
        attachment_key=attachment[0] if attachment else None,
        attachment_name=attachment[1] if attachment else None,
        attachment_mime=attachment[2] if attachment else None,
        attachment_size=attachment[3] if attachment else None,
    )
    db.add(assignment)
    db.flush()
    for student_id in recipients:
        db.add(AssignmentRecipient(assignment_id=assignment.id, student_id=student_id))
        log_activity(
            db,
            student_id,
            "assignment_received",
            f"Yangi vazifa: {assignment.title}",
            {"assignment_id": str(assignment.id)},
            actor_id=teacher.id,
        )
    db.commit()
    db.refresh(assignment)
    background.add_task(
        send_push_to_users,
        recipients,
        f"Yangi vazifa: {assignment.title}",
        (description or "Vazifa yuborildi")[:200],
        "/student/assignments",
        f"assignment-{assignment.id}",
    )
    return assignment_out(assignment, group_name=group.name if group else None, recipient_count=len(recipients))


@router.get("/{assignment_id}", response_model=dict)
def get_assignment(
    assignment_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    assignment = db.get(Assignment, assignment_id)
    if assignment is None or assignment.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")
    recipients = db.execute(
        select(User, AssignmentRecipient)
        .join(AssignmentRecipient, AssignmentRecipient.student_id == User.id)
        .where(AssignmentRecipient.assignment_id == assignment.id)
        .order_by(User.first_name.asc())
    ).all()
    return {
        **assignment_out(
            assignment,
            group_name=assignment.group.name if assignment.group else None,
            recipient_count=len(recipients),
        ),
        "recipients": [
            {
                "id": str(user.id),
                "full_name": user.full_name,
                "viewed_at": recipient.viewed_at.isoformat() if recipient.viewed_at else None,
            }
            for user, recipient in recipients
        ],
    }


@router.delete("/{assignment_id}", response_model=Message)
def delete_assignment(
    assignment_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    assignment = db.get(Assignment, assignment_id)
    if assignment is None or assignment.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")
    key = assignment.attachment_key
    db.delete(assignment)
    db.commit()
    delete_key(key)
    return Message(message="Vazifa o'chirildi")
