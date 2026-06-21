from pydantic import BaseModel


class CalendarEvent(BaseModel):
    row_number: int
    date: str
    event_id: str
    event_name: str
    is_hotel: bool
    participants: list[str]


class CalendarRsvpRequest(BaseModel):
    user_name: str
