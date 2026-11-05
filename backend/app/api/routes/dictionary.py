import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_student
from app.db.session import get_db
from app.models import (
    ActivityLog,
    DictionaryCache,
    IrregularVerb,
    RecentSearch,
    SavedVerb,
    SavedWord,
    User,
    UserRole,
)
from app.schemas.common import Message
from app.schemas.dictionary import SavedWordCreate, SavedWordUpdate
from app.services.activity import log_activity
from app.services.dictionary import (
    CACHE_VERSION,
    DictionaryUnavailable,
    WordNotFound,
    fetch_word,
)

router = APIRouter(prefix="/dictionary", tags=["dictionary"])
student_router = APIRouter(prefix="/student", tags=["dictionary"])

CACHE_DAYS = 7


@router.get("/search", response_model=dict)
def search_word(
    q: str = Query(..., min_length=1, max_length=60),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    word = " ".join(q.strip().lower().split())
    if not word:
        raise HTTPException(status_code=400, detail="So'z kiriting")
    if len(word) > 60:
        raise HTTPException(status_code=400, detail="So'z juda uzun")

    cache = db.execute(
        select(DictionaryCache).where(DictionaryCache.query == word)
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if (
        cache is not None
        and cache.expires_at > now
        and cache.payload.get("cache_version") == CACHE_VERSION
    ):
        payload = cache.payload
    else:
        try:
            payload = fetch_word(word)
        except WordNotFound:
            raise HTTPException(status_code=404, detail=f"'{word}' so'zi lug'atdan topilmadi")
        except DictionaryUnavailable:
            raise HTTPException(
                status_code=502,
                detail="Lug'at xizmatiga ulanib bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.",
            )
        if cache is None:
            cache = DictionaryCache(
                query=word,
                payload=payload,
                source=payload.get("source", ""),
                expires_at=now + timedelta(days=CACHE_DAYS),
            )
            db.add(cache)
        else:
            cache.payload = payload
            cache.source = payload.get("source", "")
            cache.fetched_at = now
            cache.expires_at = now + timedelta(days=CACHE_DAYS)

    if user.role == UserRole.student.value:
        recent = db.execute(
            select(RecentSearch).where(
                RecentSearch.student_id == user.id, RecentSearch.query == word
            )
        ).scalar_one_or_none()
        if recent:
            recent.created_at = now
        else:
            db.add(RecentSearch(student_id=user.id, query=word))
        rows = (
            db.execute(
                select(RecentSearch)
                .where(RecentSearch.student_id == user.id)
                .order_by(RecentSearch.created_at.desc())
            )
            .scalars()
            .all()
        )
        for old in rows[12:]:
            db.delete(old)

        last_log = db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == user.id, ActivityLog.type == "dictionary_search")
            .order_by(ActivityLog.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        if last_log is None or now - last_log.created_at > timedelta(minutes=15):
            log_activity(
                db,
                user.id,
                "dictionary_search",
                f"Lug'atdan qidirdi: {word}",
                {"word": word},
            )

        saved = db.execute(
            select(SavedWord).where(SavedWord.student_id == user.id, SavedWord.word == word)
        ).scalar_one_or_none()
        payload = {**payload, "is_saved": saved is not None, "saved_id": str(saved.id) if saved else None}

    db.commit()
    return payload


@router.get("/recent", response_model=list[dict])
def recent_searches(
    student: User = Depends(require_student), db: Session = Depends(get_db)
):
    rows = (
        db.execute(
            select(RecentSearch)
            .where(RecentSearch.student_id == student.id)
            .order_by(RecentSearch.created_at.desc())
            .limit(12)
        )
        .scalars()
        .all()
    )
    return [
        {"id": str(r.id), "query": r.query, "created_at": r.created_at.isoformat()}
        for r in rows
    ]


@router.delete("/recent", response_model=Message)
def clear_recent(
    student: User = Depends(require_student), db: Session = Depends(get_db)
):
    for row in db.execute(
        select(RecentSearch).where(RecentSearch.student_id == student.id)
    ).scalars():
        db.delete(row)
    db.commit()
    return Message(message="Qidiruv tarixi tozalandi")


@router.get("/irregular-verbs", response_model=list[dict])
def irregular_verbs(
    q: str | None = Query(default=None, max_length=60),
    letter: str | None = Query(default=None, max_length=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(IrregularVerb).order_by(IrregularVerb.base.asc())
    if q:
        term = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(IrregularVerb.base).like(term),
                func.lower(IrregularVerb.past_simple).like(term),
                func.lower(IrregularVerb.past_participle).like(term),
                func.lower(IrregularVerb.translation_uz).like(term),
            )
        )
    if letter and letter.isalpha():
        stmt = stmt.where(func.lower(IrregularVerb.base).like(f"{letter.lower()}%"))
    verbs = db.execute(stmt).scalars().all()

    saved_map = {}
    if user.role == UserRole.student.value:
        saved_map = {
            sv.verb_id: sv
            for sv in db.execute(
                select(SavedVerb).where(SavedVerb.student_id == user.id)
            ).scalars()
        }

    return [
        {
            "id": str(v.id),
            "base": v.base,
            "past_simple": v.past_simple,
            "past_participle": v.past_participle,
            "translation_uz": v.translation_uz,
            "pronunciation": v.pronunciation,
            "base_pron": v.base_pron,
            "past_pron": v.past_pron,
            "participle_pron": v.participle_pron,
            "example": v.example,
            "example_uz": v.example_uz,
            "irregular_type": v.irregular_type,
            "is_saved": v.id in saved_map,
            "saved_id": str(saved_map[v.id].id) if v.id in saved_map else None,
        }
        for v in verbs
    ]


@student_router.get("/saved-words", response_model=list[dict])
def saved_words(
    search: str | None = Query(default=None, max_length=100),
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    stmt = (
        select(SavedWord)
        .where(SavedWord.student_id == student.id)
        .order_by(SavedWord.created_at.desc())
    )
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(SavedWord.word).like(term),
                func.lower(SavedWord.translation).like(term),
            )
        )
    rows = db.execute(stmt).scalars().all()
    return [
        {
            "id": str(w.id),
            "word": w.word,
            "translation": w.translation,
            "phonetic": w.phonetic,
            "audio_url": w.audio_url,
            "part_of_speech": w.part_of_speech,
            "definition": w.definition,
            "example": w.example,
            "example_translation": w.example_translation,
            "synonyms": w.synonyms or [],
            "note": w.note,
            "created_at": w.created_at.isoformat(),
        }
        for w in rows
    ]


@student_router.post("/saved-words", response_model=dict, status_code=201)
def save_word(
    payload: SavedWordCreate,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    word = payload.word.strip().lower()
    existing = db.execute(
        select(SavedWord).where(SavedWord.student_id == student.id, SavedWord.word == word)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Bu so'z allaqachon daftaringizda")

    saved = SavedWord(
        student_id=student.id,
        word=word,
        translation=payload.translation,
        phonetic=payload.phonetic,
        audio_url=payload.audio_url,
        part_of_speech=payload.part_of_speech,
        definition=payload.definition,
        example=payload.example,
        example_translation=payload.example_translation,
        synonyms=payload.synonyms,
        note=payload.note,
    )
    db.add(saved)
    log_activity(
        db, student.id, "word_saved", f"Yangi so'z saqladi: {word}", {"word": word}
    )
    db.commit()
    db.refresh(saved)
    return {"id": str(saved.id), "message": "So'z daftaringizga saqlandi"}


@student_router.patch("/saved-words/{word_id}", response_model=dict)
def update_saved_word(
    word_id: uuid.UUID,
    payload: SavedWordUpdate,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    saved = db.get(SavedWord, word_id)
    if saved is None or saved.student_id != student.id:
        raise HTTPException(status_code=404, detail="So'z topilmadi")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(saved, field, value)
    db.commit()
    return {"message": "Yangilandi"}


@student_router.delete("/saved-words/{word_id}", response_model=Message)
def delete_saved_word(
    word_id: uuid.UUID,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    saved = db.get(SavedWord, word_id)
    if saved is None or saved.student_id != student.id:
        raise HTTPException(status_code=404, detail="So'z topilmadi")
    db.delete(saved)
    db.commit()
    return Message(message="So'z o'chirildi")


@student_router.post("/irregular-verbs/{verb_id}/save", response_model=dict)
def save_verb(
    verb_id: uuid.UUID,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    verb = db.get(IrregularVerb, verb_id)
    if verb is None:
        raise HTTPException(status_code=404, detail="Fe'l topilmadi")
    existing = db.execute(
        select(SavedVerb).where(SavedVerb.student_id == student.id, SavedVerb.verb_id == verb_id)
    ).scalar_one_or_none()
    if existing:
        return {"id": str(existing.id), "message": "Allaqachon saqlangan"}
    saved = SavedVerb(student_id=student.id, verb_id=verb_id)
    db.add(saved)
    log_activity(
        db, student.id, "verb_saved", f"Noto'g'ri fe'lni saqladi: {verb.base}", {"verb": verb.base}
    )
    db.commit()
    db.refresh(saved)
    return {"id": str(saved.id), "message": "Fe'l saqlandi"}


@student_router.delete("/irregular-verbs/{verb_id}/save", response_model=Message)
def remove_saved_verb(
    verb_id: uuid.UUID,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    saved = db.execute(
        select(SavedVerb).where(SavedVerb.student_id == student.id, SavedVerb.verb_id == verb_id)
    ).scalar_one_or_none()
    if saved:
        db.delete(saved)
        db.commit()
    return Message(message="Fe'l ro'yxatdan olib tashlandi")
