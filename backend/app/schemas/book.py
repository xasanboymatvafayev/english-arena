from pydantic import BaseModel, Field, field_validator


class BookUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    author: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
    level: str | None = None
    is_published: bool | None = None

    @field_validator("level")
    @classmethod
    def validate_level(cls, value: str | None) -> str | None:
        if value is not None and value not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
            raise ValueError("Noto'g'ri daraja")
        return value


class ProgressUpdate(BaseModel):
    current_page: int = Field(ge=0)
    total_pages: int | None = Field(default=None, ge=1)
    progress_percent: float | None = Field(default=None, ge=0, le=100)
    location: str | None = Field(default=None, max_length=500)


class BookmarkCreate(BaseModel):
    page: int | None = Field(default=None, ge=0)
    location: str = Field(min_length=1, max_length=500)
    label: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=500)
