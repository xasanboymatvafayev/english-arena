import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import FileResponse
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import decode_token
from app.db.session import get_db
from app.models import (
    Assignment,
    AssignmentRecipient,
    Book,
    Group,
    GroupMember,
    Reward,
    User,
    UserRole,
)
from app.services.files import resolve_key

router = APIRouter(prefix="/files", tags=["files"])

MEDIA_TYPES = {
    "book-cover": "image/webp",
    "rewards": "image/webp",
    "book-file": None,
    "assignments": "application/pdf",
}


def _check_token(token: str | None, kind: str, object_id: uuid.UUID) -> bool:
    if not token:
        return False
    try:
        payload = decode_token(token, expected_type="file")
        return payload.get("sub") == f"{kind}:{object_id}"
    except JWTError:
        return False


def _student_can_access_book(db: Session, user: User, book: Book) -> bool:
    return (
        book.is_published
        and user.role == UserRole.student.value
        and user.teacher_id == book.teacher_id
    )


def _check_access(db: Session, kind: str, object_id: uuid.UUID, user: User) -> tuple[str, str | None]:
    if kind == "book-cover":
        book = db.get(Book, object_id)
        if book is None:
            raise HTTPException(status_code=404, detail="Kitob topilmadi")
        if user.role == UserRole.teacher.value and book.teacher_id == user.id:
            return book.cover_key, "image/webp"
        if _student_can_access_book(db, user, book):
            return book.cover_key, "image/webp"
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    if kind == "book-file":
        book = db.get(Book, object_id)
        if book is None:
            raise HTTPException(status_code=404, detail="Kitob topilmadi")
        if user.role == UserRole.teacher.value and book.teacher_id == user.id:
            return book.file_key, "application/pdf" if book.file_type == "pdf" else "application/epub+zip"
        if _student_can_access_book(db, user, book):
            return book.file_key, "application/pdf" if book.file_type == "pdf" else "application/epub+zip"
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    if kind == "rewards":
        reward = db.get(Reward, object_id)
        if reward is None:
            raise HTTPException(status_code=404, detail="Sovg'a topilmadi")
        if user.role == UserRole.teacher.value and reward.teacher_id == user.id:
            return reward.image_key, "image/webp"
        if user.role == UserRole.student.value and user.teacher_id == reward.teacher_id:
            return reward.image_key, "image/webp"
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    if kind == "assignments":
        assignment = db.get(Assignment, object_id)
        if assignment is None:
            raise HTTPException(status_code=404, detail="Vazifa topilmadi")
        if user.role == UserRole.teacher.value and assignment.teacher_id == user.id:
            return assignment.attachment_key, assignment.attachment_mime or "application/pdf"
        if user.role == UserRole.student.value:
            recipient = db.execute(
                AssignmentRecipient.__table__.select().where(
                    AssignmentRecipient.assignment_id == assignment.id,
                    AssignmentRecipient.student_id == user.id,
                )
            ).first()
            if recipient:
                return assignment.attachment_key, assignment.attachment_mime or "application/pdf"
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    raise HTTPException(status_code=404, detail="Fayl turi noma'lum")


@router.get("/{kind}/{object_id}")
def get_file(
    kind: str,
    object_id: uuid.UUID,
    token: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    key: str | None = None
    media_type: str | None = MEDIA_TYPES.get(kind)

    if _check_token(token, kind, object_id):
        if kind == "book-cover":
            key = db.get(Book, object_id).cover_key if db.get(Book, object_id) else None
        elif kind == "book-file":
            book = db.get(Book, object_id)
            key = book.file_key if book else None
            media_type = (
                ("application/pdf" if book.file_type == "pdf" else "application/epub+zip")
                if book
                else None
            )
        elif kind == "rewards":
            reward = db.get(Reward, object_id)
            key = reward.image_key if reward else None
        elif kind == "assignments":
            assignment = db.get(Assignment, object_id)
            key = assignment.attachment_key if assignment else None
    else:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Avtorizatsiya talab qilinadi")
        from app.core.security import decode_token as _decode

        try:
            payload = _decode(authorization.split(" ", 1)[1], expected_type="access")
            user = db.get(User, uuid.UUID(payload["sub"]))
        except (JWTError, KeyError, ValueError):
            raise HTTPException(status_code=401, detail="Token yaroqsiz")
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")
        key, media_type = _check_access(db, kind, object_id, user)

    if not key:
        raise HTTPException(status_code=404, detail="Fayl mavjud emas")
    path = resolve_key(key)
    filename = None
    if kind == "book-file":
        book = db.get(Book, object_id)
        filename = f"{book.title}.{book.file_type}" if book else None
    elif kind == "assignments":
        assignment = db.get(Assignment, object_id)
        filename = assignment.attachment_name if assignment else None

    return FileResponse(
        path,
        media_type=media_type,
        filename=filename,
        headers={"Cache-Control": "private, max-age=3600"},
    )
