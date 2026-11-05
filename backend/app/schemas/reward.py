from pydantic import BaseModel, Field


class RewardUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    price: int | None = Field(default=None, ge=1, le=1000000)
    is_available: bool | None = None
