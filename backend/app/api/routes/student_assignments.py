import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_student
from app.db.session import get_db
from app.models import Assignment, AssignmentRecipient, User
from app.services.activity import log_activity
from app.services.serializers import assignment_out
from app.services.timeutils import APP_TZ

router = APIRouter(prefix="/student/assignments", tags=["assignments"])


def _due_status(due_at: datetime | None) -> str:
    if due_at is None:
        return "none"
    now = datetime.now(timezone.utc)
    if due_at < now:
        return "overdue"
    if due_at.astimezone(APP_TZ).date() == now.astimezone(APP_TZ).date():
        return "today"
    return "upcoming"


@router.get("", response_model=list[dict])
def my_assignments(
    student: User = Depends(require_student), db: Session = Depends(get_db)
):
    rows = db.execute(
        select(Assignment, AssignmentRecipient)
        .join(AssignmentRecipient, AssignmentRecipient.assignment_id == Assignment.id)
        .where(AssignmentRecipient.student_id == student.id)
        .order_by(Assignment.created_at.desc())
    ).all()
    return [
        {
            **assignment_out(
                assignment,
                group_name=assignment.group.name if assignment.group else None,
                viewed_at=recipient.viewed_at,
            ),
            "due_status": _due_status(assignment.due_at),
        }
        for assignment, recipient in rows
    ]


@router.get("/{assignment_id}", response_model=dict)
def assignment_detail(
    assignment_id: uuid.UUID,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    row = db.execute(
        select(Assignment, AssignmentRecipient)
        .join(AssignmentRecipient, AssignmentRecipient.assignment_id == Assignment.id)
        .where(
            Assignment.id == assignment_id,
            AssignmentRecipient.student_id == student.id,
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")
    assignment, recipient = row
    if recipient.viewed_at is None:
        recipient.viewed_at = datetime.now(timezone.utc)
        log_activity(
            db,
            student.id,
            "assignment_viewed",
            f"Vazifani ko'rdi: {assignment.title}",
            {"assignment_id": str(assignment.id)},
        )
        db.commit()
    return {
        **assignment_out(
            assignment,
            group_name=assignment.group.name if assignment.group else None,
            viewed_at=recipient.viewed_at,
        ),
        "due_status": _due_status(assignment.due_at),
        "teacher_name": assignment.teacher.full_name if assignment.teacher else None,
    }
