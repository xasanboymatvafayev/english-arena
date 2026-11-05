import uuid
from typing import Any

from app.core.config import settings
from app.core.security import create_file_token
from app.models import (
    Assignment,
    Book,
    CoinTransaction,
    Group,
    Invitation,
    Reward,
    RewardRequest,
    StudentOfTheDay,
    User,
)


def file_url(kind: str, object_id: uuid.UUID | str) -> str:
    token = create_file_token(kind, str(object_id), minutes=120)
    return f"{settings.api_prefix}/files/{kind}/{object_id}?token={token}"


def iso(value) -> str | None:
    return value.isoformat() if value else None


def user_out(user: User, group: Group | None = None) -> dict[str, Any]:
    return {
        "id": str(user.id),
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "email": user.email,
        "username": user.username,
        "coin_balance": user.coin_balance,
        "is_active": user.is_active,
        "group": {"id": str(group.id), "name": group.name, "color": group.color} if group else None,
        "created_at": iso(user.created_at),
        "last_login_at": iso(user.last_login_at),
    }


def group_out(group: Group, member_count: int | None = None) -> dict[str, Any]:
    return {
        "id": str(group.id),
        "name": group.name,
        "description": group.description,
        "color": group.color,
        "member_count": member_count if member_count is not None else len(group.members),
        "created_at": iso(group.created_at),
    }


def tx_out(tx: CoinTransaction, actor_name: str | None = None) -> dict[str, Any]:
    return {
        "id": str(tx.id),
        "student_id": str(tx.student_id),
        "amount": tx.amount,
        "balance_after": tx.balance_after,
        "type": tx.type,
        "reason": tx.reason,
        "actor_name": actor_name,
        "created_at": iso(tx.created_at),
    }


def assignment_out(
    assignment: Assignment,
    *,
    group_name: str | None = None,
    recipient_count: int | None = None,
    viewed_at=None,
) -> dict[str, Any]:
    return {
        "id": str(assignment.id),
        "title": assignment.title,
        "description": assignment.description,
        "group_id": str(assignment.group_id) if assignment.group_id else None,
        "group_name": group_name,
        "due_at": iso(assignment.due_at),
        "attachment": {
            "name": assignment.attachment_name,
            "size": assignment.attachment_size,
            "mime": assignment.attachment_mime,
            "url": file_url("assignments", assignment.id) if assignment.attachment_key else None,
        }
        if assignment.attachment_key
        else None,
        "recipient_count": recipient_count,
        "viewed_at": iso(viewed_at),
        "created_at": iso(assignment.created_at),
    }


def reward_out(reward: Reward, *, pending_count: int | None = None) -> dict[str, Any]:
    return {
        "id": str(reward.id),
        "title": reward.title,
        "description": reward.description,
        "price": reward.price,
        "is_available": reward.is_available,
        "is_archived": reward.is_archived,
        "image_url": file_url("rewards", reward.id) if reward.image_key else None,
        "pending_count": pending_count,
        "created_at": iso(reward.created_at),
    }


def request_out(request: RewardRequest, student: User | None = None, reward: Reward | None = None) -> dict[str, Any]:
    return {
        "id": str(request.id),
        "status": request.status,
        "price": request.price_snapshot,
        "note": request.note,
        "requested_at": iso(request.requested_at),
        "resolved_at": iso(request.resolved_at),
        "refunded_at": iso(request.refunded_at),
        "student": {
            "id": str(student.id),
            "full_name": student.full_name,
            "email": student.email,
        }
        if student
        else None,
        "reward": {
            "id": str(reward.id),
            "title": reward.title,
            "image_url": file_url("rewards", reward.id) if reward.image_key else None,
        }
        if reward
        else None,
    }


def book_out(
    book: Book,
    *,
    progress=None,
    is_favorite: bool = False,
) -> dict[str, Any]:
    return {
        "id": str(book.id),
        "title": book.title,
        "author": book.author,
        "description": book.description,
        "level": book.level,
        "file_type": book.file_type,
        "file_size": book.file_size,
        "is_published": book.is_published,
        "cover_url": file_url("book-cover", book.id) if book.cover_key else None,
        "file_url": file_url("book-file", book.id),
        "is_favorite": is_favorite,
        "progress": {
            "current_page": progress.current_page,
            "total_pages": progress.total_pages,
            "progress_percent": round(progress.progress_percent, 1),
            "location": progress.location,
            "last_read_at": iso(progress.last_read_at),
        }
        if progress
        else None,
        "created_at": iso(book.created_at),
    }


def invitation_out(invitation: Invitation, invite_link: str | None = None) -> dict[str, Any]:
    return {
        "id": str(invitation.id),
        "first_name": invitation.first_name,
        "last_name": invitation.last_name,
        "email": invitation.email,
        "group_id": str(invitation.group_id),
        "group_name": invitation.group.name if invitation.group else None,
        "status": invitation.status,
        "expires_at": iso(invitation.expires_at),
        "accepted_at": iso(invitation.accepted_at),
        "last_sent_at": iso(invitation.last_sent_at),
        "email_error": invitation.email_error,
        "invite_link": invite_link,
        "created_at": iso(invitation.created_at),
    }


def sotd_out(entry: StudentOfTheDay) -> dict[str, Any]:
    return {
        "id": str(entry.id),
        "student_id": str(entry.student_id),
        "student_name": entry.student.full_name if entry.student else None,
        "group_name": entry.student.membership.group.name
        if entry.student and entry.student.membership
        else None,
        "note": entry.note,
        "awarded_on": entry.awarded_on.isoformat(),
    }
