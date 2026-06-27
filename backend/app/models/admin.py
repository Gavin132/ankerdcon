from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class AdminCreateUserRequest(BaseModel):
    name: str
    discord_id: Optional[str] = None
    is_admin: bool = False


class AdminUpdateUserRequest(BaseModel):
    hotel_room: Optional[str] = None
    phone_number: Optional[str] = None
    pronouns: Optional[str] = None
    bio: Optional[str] = None
    color: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    aliases: Optional[list[str]] = None


class AdminUpdateRideRequest(BaseModel):
    direction: Optional[str] = None
    vehicle_type: Optional[str] = None
    driver: Optional[str] = None
    departure_time: Optional[str] = None
    start_location: Optional[str] = None
    total_seats: Optional[int] = None
    parking_info: Optional[str] = None
    maps_link: Optional[str] = None
    car_available: Optional[bool] = None
    action_required: Optional[bool] = None


class AdminCreateMealRequest(BaseModel):
    meal_name: str
    time: str
    location: str = ""
    cost: float = 0.0
    transport_needed: bool = False


class AdminUpdateMealRequest(BaseModel):
    meal_name: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    cost: Optional[float] = None
    transport_needed: Optional[bool] = None


class AdminCreateCalendarEventRequest(BaseModel):
    event_name: str
    date: str
    event_group_id: Optional[str] = None
    is_hotel: bool = False
    description: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    ticket_url: Optional[str] = None
    ticket_sale_start: Optional[str] = None
    ticket_types: Optional[list[dict]] = None
    locker_info: Optional[str] = None
    parking_info: Optional[str] = None
    special_instructions: Optional[str] = None
    what_to_bring: Optional[str] = None


class AdminUpdateCalendarEventRequest(BaseModel):
    event_name: Optional[str] = None
    date: Optional[str] = None
    event_group_id: Optional[str] = None
    is_hotel: Optional[bool] = None
    description: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    ticket_url: Optional[str] = None
    ticket_sale_start: Optional[str] = None
    ticket_types: Optional[list[dict]] = None
    locker_info: Optional[str] = None
    parking_info: Optional[str] = None
    special_instructions: Optional[str] = None
    what_to_bring: Optional[str] = None


class EventGroup(BaseModel):
    id: str
    name: str
    created_at: str


class CreateEventGroupRequest(BaseModel):
    name: str


class UpdateEventGroupRequest(BaseModel):
    name: str
