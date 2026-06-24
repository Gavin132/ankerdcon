from pydantic import BaseModel, model_validator
from typing import Any

class CalendarEvent(BaseModel):
    id: str
    event_group_id: str | None = None
    event_name: str
    date: str
    is_hotel: bool = False
    participants: list[str] = []

    @model_validator(mode='before')
    @classmethod
    def clean_nulls(cls, data: Any) -> Any:
        # If Supabase returns None for is_hotel, make it False
        if data.get('is_hotel') is None:
            data['is_hotel'] = False
            
        # If Supabase returns None for participants, make it an empty list
        if data.get('participants') is None:
            data['participants'] = []
            
        return data

class CalendarRsvpRequest(BaseModel):
    user_name: str