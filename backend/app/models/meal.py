from pydantic import BaseModel
from typing import Optional
from app.core.validation import WebUrl


class Meal(BaseModel):
    id: str
    meal_name: str
    time: str
    location: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    maps_url: Optional[str] = None
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
    created_by: Optional[str] = None


class CreateMealRequest(BaseModel):
    meal_name: str
    time: str
    location: str = ""
    maps_url: WebUrl = None
    cost: str = ""
    transport_needed: bool = False
    linked_event_id: Optional[str] = None
    website: WebUrl = None
    menu_url: WebUrl = None
    description: Optional[str] = None
    dietary_options: Optional[str] = None
    parking_info: Optional[str] = None
    extra_notes: Optional[str] = None


class RsvpRequest(BaseModel):
    user_name: str
