from pydantic import BaseModel


class Split(BaseModel):
    name: str
    amount: float


class Payment(BaseModel):
    id: str
    paid_by: str
    amount: float
    description: str
    date: str
    splits: list[Split] = []


class CreatePaymentRequest(BaseModel):
    paid_by: str
    amount: float
    description: str
    date: str
    splits: list[Split] = []
