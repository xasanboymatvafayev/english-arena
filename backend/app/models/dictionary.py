import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class DictionaryCache(Base):
    __tablename__ = "dictionary_cache"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    query: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(nullable=False)
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SavedWord(Base, TimestampMixin):
    __tablename__ = "saved_words"
    __table_args__ = (UniqueConstraint("student_id", "word", name="uq_saved_word_student_word"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    word: Mapped[str] = mapped_column(String(120), nullable=False)
    translation: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    phonetic: Mapped[str | None] = mapped_column(String(120), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    part_of_speech: Mapped[str | None] = mapped_column(String(50), nullable=True)
    definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_translation: Mapped[str | None] = mapped_column(Text, nullable=True)
    synonyms: Mapped[list] = mapped_column(default=list)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class RecentSearch(Base):
    __tablename__ = "recent_searches"
    __table_args__ = (
        UniqueConstraint("student_id", "query", name="uq_recent_search_student_query"),
        Index("ix_recent_search_student_created", "student_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    query: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IrregularVerb(Base):
    __tablename__ = "irregular_verbs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    base: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    past_simple: Mapped[str] = mapped_column(String(60), nullable=False)
    past_participle: Mapped[str] = mapped_column(String(60), nullable=False)
    translation_uz: Mapped[str] = mapped_column(String(200), nullable=False)
    pronunciation: Mapped[str | None] = mapped_column(String(120), nullable=True)
    base_pron: Mapped[str | None] = mapped_column(String(120), nullable=True)
    past_pron: Mapped[str | None] = mapped_column(String(120), nullable=True)
    participle_pron: Mapped[str | None] = mapped_column(String(120), nullable=True)
    example: Mapped[str] = mapped_column(Text, nullable=False)
    example_uz: Mapped[str] = mapped_column(Text, nullable=False)
    irregular_type: Mapped[str | None] = mapped_column(String(60), nullable=True)


class SavedVerb(Base, TimestampMixin):
    __tablename__ = "saved_verbs"
    __table_args__ = (UniqueConstraint("student_id", "verb_id", name="uq_saved_verb_student_verb"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    verb_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("irregular_verbs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
