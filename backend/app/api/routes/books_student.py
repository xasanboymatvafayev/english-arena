import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import require_student
from app.db.session import get_db
from app.models import Book, BookFavorite, Bookmark, ReadingProgress, User
from app.schemas.book import BookmarkCreate, ProgressUpdate
from app.schemas.common import Message
from app.services.activity import log_activity
from app.services.serializers import book_out, iso

router = APIRouter(prefix="/student", tags=["library"])


def _get_book(db: Session, student: User, book_id: uuid.UUID) -> Book:
    book = db.get(Book, book_id)
    if book is None or book.teacher_id != student.teacher_id or not book.is_published:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")
    return book


@router.get("/books", response_model=list[dict])
def catalog(
    level: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=100),
    favorites: bool = False,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Book)
        .where(Book.teacher_id == student.teacher_id, Book.is_published.is_(True))
        .order_by(Book.created_at.desc())
    )
    if level:
        stmt = stmt.where(Book.level == level)
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(func.lower(Book.title).like(term), func.lower(Book.author).like(term))
        )
    if favorites:
        stmt = stmt.join(BookFavorite, BookFavorite.book_id == Book.id).where(
            BookFavorite.student_id == student.id
        )
    books = db.execute(stmt).scalars().all()
    progress_map = {
        p.book_id: p
        for p in db.execute(
            select(ReadingProgress).where(
                ReadingProgress.student_id == student.id,
                ReadingProgress.book_id.in_([b.id for b in books]) if books else False,
            )
        )
        .scalars()
        .all()
    }
    favorite_ids = set(
        db.execute(
            select(BookFavorite.book_id).where(BookFavorite.student_id == student.id)
        ).scalars()
    )
    return [
        book_out(book, progress=progress_map.get(book.id), is_favorite=book.id in favorite_ids)
        for book in books
    ]


@router.get("/books/recent", response_model=list[dict])
def recent_books(student: User = Depends(require_student), db: Session = Depends(get_db)):
    rows = db.execute(
        select(ReadingProgress, Book)
        .join(Book, Book.id == ReadingProgress.book_id)
        .where(ReadingProgress.student_id == student.id)
        .order_by(ReadingProgress.last_read_at.desc())
        .limit(10)
    ).all()
    favorite_ids = set(
        db.execute(
            select(BookFavorite.book_id).where(BookFavorite.student_id == student.id)
        ).scalars()
    )
    return [
        book_out(book, progress=progress, is_favorite=book.id in favorite_ids)
        for progress, book in rows
    ]


@router.get("/books/{book_id}", response_model=dict)
def book_detail(
    book_id: uuid.UUID, student: User = Depends(require_student), db: Session = Depends(get_db)
):
    book = _get_book(db, student, book_id)
    progress = db.execute(
        select(ReadingProgress).where(
            ReadingProgress.book_id == book.id, ReadingProgress.student_id == student.id
        )
    ).scalar_one_or_none()
    favorite = db.execute(
        select(BookFavorite).where(
            BookFavorite.book_id == book.id, BookFavorite.student_id == student.id
        )
    ).scalar_one_or_none()
    return book_out(book, progress=progress, is_favorite=favorite is not None)


@router.put("/books/{book_id}/progress", response_model=dict)
def save_progress(
    book_id: uuid.UUID,
    payload: ProgressUpdate,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    book = _get_book(db, student, book_id)
    progress = db.execute(
        select(ReadingProgress).where(
            ReadingProgress.book_id == book.id, ReadingProgress.student_id == student.id
        )
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if progress is None:
        progress = ReadingProgress(
            book_id=book.id, student_id=student.id, started_at=now, last_read_at=now
        )
        db.add(progress)
        log_activity(
            db,
            student.id,
            "book_started",
            f"Kitob o'qishni boshladi: {book.title}",
            {"book_id": str(book.id)},
        )
    elif (now - progress.last_read_at).total_seconds() > 1800:
        log_activity(
            db,
            student.id,
            "book_read",
            f"Kitob o'qimoqda: {book.title}",
            {"book_id": str(book.id)},
        )

    total = payload.total_pages or progress.total_pages
    if total and payload.current_page > total:
        raise HTTPException(status_code=400, detail="Sahifa raqami umumiy sahifadan katta")
    progress.current_page = payload.current_page
    progress.total_pages = total
    if payload.progress_percent is not None:
        progress.progress_percent = payload.progress_percent
    elif total:
        progress.progress_percent = min(100.0, max(0.0, payload.current_page / total * 100))
    if payload.location is not None:
        progress.location = payload.location
    progress.last_read_at = now
    db.commit()
    return {
        "current_page": progress.current_page,
        "total_pages": progress.total_pages,
        "progress_percent": round(progress.progress_percent, 1),
        "location": progress.location,
        "last_read_at": iso(progress.last_read_at),
    }


@router.get("/books/{book_id}/bookmarks", response_model=list[dict])
def list_bookmarks(
    book_id: uuid.UUID, student: User = Depends(require_student), db: Session = Depends(get_db)
):
    _get_book(db, student, book_id)
    rows = (
        db.execute(
            select(Bookmark)
            .where(Bookmark.book_id == book_id, Bookmark.student_id == student.id)
            .order_by(Bookmark.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": str(b.id),
            "page": b.page,
            "location": b.location,
            "label": b.label,
            "note": b.note,
            "created_at": iso(b.created_at),
        }
        for b in rows
    ]


@router.post("/books/{book_id}/bookmarks", response_model=dict, status_code=201)
def add_bookmark(
    book_id: uuid.UUID,
    payload: BookmarkCreate,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    _get_book(db, student, book_id)
    existing = db.execute(
        select(Bookmark).where(
            Bookmark.book_id == book_id,
            Bookmark.student_id == student.id,
            Bookmark.location == payload.location,
        )
    ).scalar_one_or_none()
    if existing:
        existing.label = payload.label
        existing.note = payload.note
        existing.page = payload.page
        db.commit()
        bookmark = existing
    else:
        bookmark = Bookmark(
            book_id=book_id,
            student_id=student.id,
            page=payload.page,
            location=payload.location,
            label=payload.label,
            note=payload.note,
        )
        db.add(bookmark)
        db.commit()
    db.refresh(bookmark)
    log_activity(
        db,
        student.id,
        "bookmark_added",
        f"Kitobga belgi qo'ydi: {payload.label or payload.location}",
        {"book_id": str(book_id)},
    )
    db.commit()
    return {
        "id": str(bookmark.id),
        "page": bookmark.page,
        "location": bookmark.location,
        "label": bookmark.label,
        "note": bookmark.note,
        "created_at": iso(bookmark.created_at),
    }


@router.delete("/books/{book_id}/bookmarks/{bookmark_id}", response_model=Message)
def delete_bookmark(
    book_id: uuid.UUID,
    bookmark_id: uuid.UUID,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    bookmark = db.get(Bookmark, bookmark_id)
    if bookmark is None or bookmark.student_id != student.id or bookmark.book_id != book_id:
        raise HTTPException(status_code=404, detail="Belgi topilmadi")
    db.delete(bookmark)
    db.commit()
    return Message(message="Belgi o'chirildi")


@router.post("/books/{book_id}/favorite", response_model=Message)
def add_favorite(
    book_id: uuid.UUID, student: User = Depends(require_student), db: Session = Depends(get_db)
):
    _get_book(db, student, book_id)
    existing = db.execute(
        select(BookFavorite).where(
            BookFavorite.book_id == book_id, BookFavorite.student_id == student.id
        )
    ).scalar_one_or_none()
    if existing is None:
        db.add(BookFavorite(book_id=book_id, student_id=student.id))
        db.commit()
    return Message(message="Sevimlilarga qo'shildi")


@router.delete("/books/{book_id}/favorite", response_model=Message)
def remove_favorite(
    book_id: uuid.UUID, student: User = Depends(require_student), db: Session = Depends(get_db)
):
    existing = db.execute(
        select(BookFavorite).where(
            BookFavorite.book_id == book_id, BookFavorite.student_id == student.id
        )
    ).scalar_one_or_none()
    if existing:
        db.delete(existing)
        db.commit()
    return Message(message="Sevimlilardan olib tashlandi")
