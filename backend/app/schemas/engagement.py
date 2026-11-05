from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=2)
    group_id: str | None = None
    is_pinned: bool = False


class SOTDCreate(BaseModel):
    student_id: str
    note: str | None = Field(default=None, max_length=300)
    awarded_on: date | None = None


class GoalCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    metric: str = Field(default="coins", pattern=r"^(coins|books|words)$")
    target_value: int = Field(ge=1, le=100000)
    student_id: str | None = None
    group_id: str | None = None
    week_start: date | None = None

    @field_validator("week_start")
    @classmethod
    def monday_only(cls, value: date | None) -> date | None:
        if value is not None and value.weekday() != 0:
            raise ValueError("Hafta dushanba kunidan boshlanishi kerak")
        return value
