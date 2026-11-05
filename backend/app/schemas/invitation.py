from pydantic import BaseModel, EmailStr, Field, field_validator


class InvitationCreate(BaseModel):
    group_id: str
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    email: EmailStr

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return " ".join(value.split())
