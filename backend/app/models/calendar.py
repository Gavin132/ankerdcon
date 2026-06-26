from pydantic import BaseModel, model_validator
from typing import Any

class CalendarEvent(BaseModel):
    id: str
    event_group_id: str | None = None
    event_name: str
    date: str
    is_hotel: bool = False
    participants: list[str] = []
    # Info fields
    description: str | None = None
    location: str | None = None
    website: str | None = None
    ticket_url: str | None = None
    ticket_sale_start: str | None = None
    ticket_types: list[dict] | None = None   # [{title, price}]
    locker_info: str | None = None
    parking_info: str | None = None
    special_instructions: str | None = None
    what_to_bring: str | None = None

    @model_validator(mode='before')
    @classmethod
    def clean_nulls(cls, data: Any) -> Any:
        if data.get('is_hotel') is None:
            data['is_hotel'] = False
        if data.get('participants') is None:
            data['participants'] = []
        return data

class CalendarRsvpRequest(BaseModel):
    user_name: str