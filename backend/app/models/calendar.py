from pydantic import BaseModel, model_validator
from typing import Any

class CalendarEvent(BaseModel):
    id: str
    event_group_id: str | None = None
    multi_day_id: str | None = None
    event_name: str
    date: str
    has_con: bool = True
    is_hotel: bool = False
    is_party: bool = False
    hotel_location: str | None = None
    hotel_info: str | None = None
    participants: list[str] = []
    # Info fields
    image_url: str | None = None
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
        if data.get('is_party') is None:
            data['is_party'] = False
        if data.get('has_con') is None:
            data['has_con'] = True
        if data.get('participants') is None:
            data['participants'] = []
        return data

class CalendarRsvpRequest(BaseModel):
    user_name: str


class Event(BaseModel):
    """A trip/convention as the admin actually manages it — the real parent
    row. `CalendarEvent` above is the read-only adapter shape everything
    user-facing still consumes; this is the real schema."""
    id: str
    event_group_id: str | None = None
    event_name: str
    is_hotel: bool = False
    is_party: bool = False
    hotel_location: str | None = None
    hotel_info: str | None = None
    image_url: str | None = None
    description: str | None = None
    location: str | None = None
    website: str | None = None
    ticket_url: str | None = None
    ticket_sale_start: str | None = None
    ticket_types: list[dict] | None = None
    locker_info: str | None = None
    parking_info: str | None = None
    special_instructions: str | None = None
    what_to_bring: str | None = None
    created_at: str | None = None


class EventDay(BaseModel):
    id: str
    event_id: str
    date: str
    has_con: bool = True
    participants: list[str] = []
    created_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def clean_nulls(cls, data: Any) -> Any:
        if data.get("participants") is None:
            data["participants"] = []
        if data.get("has_con") is None:
            data["has_con"] = True
        return data


class HotelRoom(BaseModel):
    id: str
    event_id: str
    room_number: str | None = None
    floor: str | None = None
    instructions: str | None = None
    capacity: int | None = None
    occupants: list[str] = []
    created_at: str | None = None


class CreateHotelRoomRequest(BaseModel):
    room_number: str | None = None
    floor: str | None = None
    instructions: str | None = None
    capacity: int | None = None
    occupants: list[str] = []


MAX_ROOMS_PER_REQUEST = 100


class HotelRoomBatch(BaseModel):
    """One "10 rooms of 2 people" line in a bulk-create request."""
    count: int
    capacity: int | None = None

    @model_validator(mode="after")
    def _validate(self) -> "HotelRoomBatch":
        if not 1 <= self.count <= MAX_ROOMS_PER_REQUEST:
            raise ValueError(f"Aantal kamers moet tussen 1 en {MAX_ROOMS_PER_REQUEST} liggen.")
        if self.capacity is not None and not 1 <= self.capacity <= 20:
            raise ValueError("Capaciteit moet tussen 1 en 20 liggen.")
        return self


class BulkCreateHotelRoomsRequest(BaseModel):
    batches: list[HotelRoomBatch]

    @model_validator(mode="after")
    def _require_batches(self) -> "BulkCreateHotelRoomsRequest":
        if not self.batches:
            raise ValueError("Geef minstens één groep kamers op.")
        # Any member may call this, so the total is capped: an uncapped count
        # would let one request build millions of rows in memory.
        if sum(b.count for b in self.batches) > MAX_ROOMS_PER_REQUEST:
            raise ValueError(f"Maximaal {MAX_ROOMS_PER_REQUEST} kamers per keer.")
        return self


class HotelRoomAssignRequest(BaseModel):
    user_names: list[str]


class HotelRoomLeaveRequest(BaseModel):
    user_name: str