from typing import Literal, Optional
from pydantic import BaseModel, Field


class Settlement(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    # Current names, looked up when listing — the ids are what's stored.
    from_user: str
    to_user: str
    amount: float
    currency: str
    status: str  # requested | claimed | confirmed
    # How to pay, added by the receiver for this one request only; cleared
    # once the payment is confirmed. Never stored on a profile.
    request_url: Optional[str] = None
    iban: Optional[str] = None
    account_name: Optional[str] = None
    created_at: Optional[str] = None
    claimed_at: Optional[str] = None
    confirmed_at: Optional[str] = None


class SettleUpItem(BaseModel):
    """What's still open between the current member and one other member,
    not counting shares already in a settlement."""
    counterparty_id: str
    counterparty: str
    direction: Literal["i_owe", "owes_me", "even"]
    amount: float
    currency: str
    share_count: int
    # A settlement for this pair is already under way; a new one waits for it.
    blocked_by_settlement: bool = False


class SettleUpOverview(BaseModel):
    items: list[SettleUpItem] = []
    settlements: list[Settlement] = []


class CreateSettlementRequest(BaseModel):
    counterparty_id: str
    currency: str = "EUR"
    # paid:     I owe, and I've paid (bank transfer, their Tikkie, cash) — they confirm.
    # request:  I'm owed, and send a payment request (link and/or IBAN).
    # received: I'm owed, and already have the money (cash) — settled straight away.
    action: Literal["paid", "request", "received"]
    request_url: Optional[str] = Field(None, max_length=500)
    iban: Optional[str] = Field(None, max_length=42)
    account_name: Optional[str] = Field(None, max_length=70)
