from pydantic import BaseModel
from typing import Optional


class Meal(BaseModel):
    id: str
    meal_name: str
    time: str
    location: str
    cost: float
    transport_needed: bool
    participants: list[str] = []
    linked_event_id: Optional[str] = None
    website: Optional[str] = None
    menu_url: Optional[str] = None
    description: Optional[str] = None
    dietary_options: Optional[str] = None
    parking_info: Optional[str] = None
    extra_notes: Optional[str] = None


class CreateMealRequest(BaseModel):
    meal_name: str
    time: str
    location: str = ""
    cost: str = ""
    transport_needed: bool = False
    linked_event_id: Optional[str] = None
    website: Optional[str] = None
    menu_url: Optional[str] = None
    description: Optional[str] = None
    dietary_options: Optional[str] = None
    parking_info: Optional[str] = None
    extra_notes: Optional[str] = None


class RsvpRequest(BaseModel):
    user_name: str
