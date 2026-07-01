from typing import Optional
from pydantic import BaseModel


class ExpenseShare(BaseModel):
    id: str
    expense_id: str
    participant: str
    amount: float
    payment_ref: str
    status: str  # pending | claimed | confirmed
    claimed_at: Optional[str] = None
    confirmed_at: Optional[str] = None


class Expense(BaseModel):
    id: str
    paid_by: str
    amount: float
    currency: str
    description: str
    date: str
    created_at: Optional[str] = None
    shares: list[ExpenseShare] = []


class CreateExpenseShareInput(BaseModel):
    participant: str
    amount: float


class CreateExpenseRequest(BaseModel):
    paid_by: str
    amount: float
    currency: str = "EUR"
    description: str
    date: str
    shares: list[CreateExpenseShareInput] = []
