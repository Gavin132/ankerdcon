from pydantic import BaseModel


class Payment(BaseModel):
    row_number: int
    paid_by: str
    amount: str
    description: str
    date: str


class CreatePaymentRequest(BaseModel):
    paid_by: str
    amount: str
    description: str
    date: str
