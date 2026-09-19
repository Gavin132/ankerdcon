from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, field_validator
from app.core.validation import ImageUrl, WebUrl


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
    linked_event_id: Optional[str] = None


class AdminCreateMealRequest(BaseModel):
    meal_name: str
    time: str
    location: str = ""
    cost: float = 0.0
    transport_needed: bool = False
    linked_event_id: Optional[str] = None
    website: WebUrl = None
    menu_url: WebUrl = None
    description: Optional[str] = None
    dietary_options: Optional[str] = None
    parking_info: Optional[str] = None
    extra_notes: Optional[str] = None


class AdminUpdateMealRequest(BaseModel):
    meal_name: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    cost: Optional[float] = None
    transport_needed: Optional[bool] = None
    linked_event_id: Optional[str] = None
    website: WebUrl = None
    menu_url: WebUrl = None
    description: Optional[str] = None
    dietary_options: Optional[str] = None
    parking_info: Optional[str] = None
    extra_notes: Optional[str] = None


class AdminCreateEventRequest(BaseModel):
    event_name: str
    event_group_id: Optional[str] = None
    is_hotel: bool = False
    is_party: bool = False
    hotel_location: Optional[str] = None
    hotel_info: Optional[str] = None
    image_url: ImageUrl = None
    description: Optional[str] = None
    location: Optional[str] = None
    website: WebUrl = None
    ticket_url: WebUrl = None
    ticket_sale_start: Optional[str] = None
    ticket_types: Optional[list[dict]] = None
    locker_info: Optional[str] = None
    parking_info: Optional[str] = None
    special_instructions: Optional[str] = None
    what_to_bring: Optional[str] = None


class AdminUpdateEventRequest(BaseModel):
    event_name: Optional[str] = None
    event_group_id: Optional[str] = None
    is_hotel: Optional[bool] = None
    is_party: Optional[bool] = None
    hotel_location: Optional[str] = None
    hotel_info: Optional[str] = None
    image_url: ImageUrl = None
    description: Optional[str] = None
    location: Optional[str] = None
    website: WebUrl = None
    ticket_url: WebUrl = None
    ticket_sale_start: Optional[str] = None
    ticket_types: Optional[list[dict]] = None
    locker_info: Optional[str] = None
    parking_info: Optional[str] = None
    special_instructions: Optional[str] = None
    what_to_bring: Optional[str] = None


class CreateEventDayRequest(BaseModel):
    date: str
    has_con: bool = True


class UpdateEventDayRequest(BaseModel):
    date: Optional[str] = None
    has_con: Optional[bool] = None


class EventGroup(BaseModel):
    id: str
    name: str
    created_at: str


class CreateEventGroupRequest(BaseModel):
    name: str


class UpdateEventGroupRequest(BaseModel):
    name: str


class BulkDeleteEventsRequest(BaseModel):
    event_ids: list[str]


class BulkDeleteUsersRequest(BaseModel):
    user_ids: list[str]


class BulkDeactivateUsersRequest(BaseModel):
    user_ids: list[str]


class BulkDeleteRidesRequest(BaseModel):
    ride_ids: list[str]


class BulkDeleteMealsRequest(BaseModel):
    meal_ids: list[str]


class BulkDeleteEventGroupsRequest(BaseModel):
    group_ids: list[str]


class AdminUpdateHotelRoomRequest(BaseModel):
    room_number: Optional[str] = None
    floor: Optional[str] = None
    instructions: Optional[str] = None
    capacity: Optional[int] = None
    occupants: Optional[list[str]] = None


class BulkRsvpRequest(BaseModel):
    user_names: list[str]


class BulkSetEventGroupRequest(BaseModel):
    event_ids: list[str]
    group_id: str | None = None  # None = clear group label


class AdminUpdateExpenseRequest(BaseModel):
    linked_event_id: Optional[str] = None


class AdminSetShareStatusRequest(BaseModel):
    status: str  # pending | claimed | confirmed

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ("pending", "claimed", "confirmed"):
            raise ValueError("Status moet pending, claimed of confirmed zijn.")
        return v
