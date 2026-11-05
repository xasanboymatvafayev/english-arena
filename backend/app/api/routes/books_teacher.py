import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import require_teacher
from app.db.session import get_db
from app.models import Book, BookFavorite, ReadingProgress, User
from app.schemas.book import BookUpdate
from app.schemas.common import Message
from app.services.files import delete_key, save_book_file, save_image
from app.services.serializers import book_out
from app.core.config import settings

router = APIRouter(prefix="/teacher/books", tags=["books"])

LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}


@router.get("", response_model=list[dict])
def list_books(teacher: User = Depends(require_teacher), db: Session = Depends(get_db)):
    books = (
        db.execute(
            select(Book).where(Book.teacher_id == teacher.id).order_by(Book.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [book_out(book) for book in books]


@router.post("", response_model=dict, status_code=201)
def create_book(
    title: str = Form(..., min_length=1, max_length=200),
    author: str = Form(..., min_length=1, max_length=150),
    description: str = Form(default=""),
    level: str = Form(...),
    is_published: bool = Form(default=True),
    cover: UploadFile | None = File(default=None),
    file: UploadFile = File(...),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if level not in LEVELS:
        raise HTTPException(status_code=400, detail="Daraja A1–C2 oralig'ida bo'lishi kerak")
    file_key, file_type, file_size = save_book_file(file)
    cover_key = None
    try:
        if cover is not None and cover.filename:
            cover_key, _ = save_image(cover, "covers")
        book = Book(
            teacher_id=teacher.id,
            title=" ".join(title.split()),
            author=" ".join(author.split()),
            description=description.strip(),
            level=level,
            cover_key=cover_key,
            file_key=file_key,
            file_type=file_type,
            file_size=file_size,
            is_published=is_published,
        )
        db.add(book)
        db.commit()
    except Exception:
        delete_key(file_key)
        delete_key(cover_key)
        raise
    db.refresh(book)
    return book_out(book)


@router.patch("/{book_id}", response_model=dict)
def update_book(
    book_id: uuid.UUID,
    payload: BookUpdate,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    book = db.get(Book, book_id)
    if book is None or book.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
    db.commit()
    db.refresh(book)
    return book_out(book)


@router.post("/{book_id}/cover", response_model=dict)
def update_cover(
    book_id: uuid.UUID,
    cover: UploadFile = File(...),
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    book = db.get(Book, book_id)
    if book is None or book.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")
    old_key = book.cover_key
    book.cover_key, _ = save_image(cover, "covers")
    db.commit()
    delete_key(old_key)
    return book_out(book)


@router.delete("/{book_id}", response_model=Message)
def delete_book(
    book_id: uuid.UUID,
    teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    book = db.get(Book, book_id)
    if book is None or book.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")
    file_key, cover_key = book.file_key, book.cover_key
    db.delete(book)
    db.commit()
    delete_key(file_key)
    delete_key(cover_key)
    return Message(message="Kitob o'chirildi")
