from datetime import datetime

from pydantic import BaseModel, field_validator


class AssignmentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_at: datetime | None = None

    @field_validator("due_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("Vaqt vaqt mintaqasi bilan yuborilishi kerak")
        return value
