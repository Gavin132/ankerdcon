from typing import Optional
from pydantic import BaseModel, model_validator


class ExpenseShare(BaseModel):
    id: str
    expense_id: str
    participant: str
    amount: float
    status: str  # pending | claimed | confirmed
    claimed_at: Optional[str] = None
    confirmed_at: Optional[str] = None
    # Set while (or since) the share is covered by a settle-up payment.
    settlement_id: Optional[str] = None


class Expense(BaseModel):
    id: str
    paid_by: str
    amount: float
    currency: str
    description: str
    date: str
    created_at: Optional[str] = None
    linked_event_id: Optional[str] = None
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
    # Any day of the trip the expense belongs to; the app groups by trip.
    linked_event_id: Optional[str] = None
    shares: list[CreateExpenseShareInput] = []

    @model_validator(mode="after")
    def shares_add_up(self) -> "CreateExpenseRequest":
        # Settling up works from the share amounts, so they have to be the
        # whole bill: nothing left over, nothing counted twice.
        if self.amount <= 0:
            raise ValueError("Het bedrag moet groter dan 0 zijn.")
        if not self.shares:
            raise ValueError("Kies wie er meebetalen.")
        if any(s.amount <= 0 for s in self.shares):
            raise ValueError("Elk aandeel moet groter dan 0 zijn.")
        if len({s.participant for s in self.shares}) != len(self.shares):
            raise ValueError("Iemand staat dubbel in de verdeling.")
        if round(sum(s.amount for s in self.shares) * 100) != round(self.amount * 100):
            raise ValueError("De verdeling telt niet op tot het bedrag.")
        return self
