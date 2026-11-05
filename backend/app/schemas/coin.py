from pydantic import BaseModel, Field


class CoinAdjustRequest(BaseModel):
    student_id: str
    amount: int = Field(ge=-100000, le=100000)
    reason: str = Field(min_length=2, max_length=300)


class CoinAdjustResponse(BaseModel):
    balance: int
    transaction_id: str
