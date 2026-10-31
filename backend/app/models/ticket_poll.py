from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class TicketOption(BaseModel):
    """One ticket to pick, for example "Za + Zo" at 85 euro. `id` is set by the server when the vote opens."""
    id: str = ""
    label: str = Field(..., min_length=1, max_length=60)
    price: float = Field(default=0, ge=0, le=10000)


class OpenTicketPollRequest(BaseModel):
    options: list[TicketOption] = Field(..., min_length=1, max_length=8)


class TicketVote(BaseModel):
    voter: str
    # An option id, or "unsure".
    choice: str


class TicketPoll(BaseModel):
    id: str
    event_id: str
    status: str
    options: list[TicketOption]
    votes: list[TicketVote] = []
    # Set once the tickets are bought.
    buyer: Optional[str] = None
    chosen_option: Optional[str] = None


class CastVoteRequest(BaseModel):
    # None votes for yourself; any member's name fills the vote in for them.
    user_name: Optional[str] = None
    choice: str = Field(..., min_length=1, max_length=40)


class TicketsBoughtRequest(BaseModel):
    buyer: str = Field(..., min_length=1, max_length=100)
    option_id: str = Field(..., min_length=1, max_length=40)
