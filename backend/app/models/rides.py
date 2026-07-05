from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class RestaurantDriver(BaseModel):
    name: str
    seats: int
    passengers: list[str] = Field(default_factory=list)


class Ride(BaseModel):
    id: str
    direction: str
    vehicle_type: str
    driver: str
    departure_time: str
    start_location: str
    total_seats: int = 0
    passengers: list[str] = Field(default_factory=list)
    parking_info: str | None = ""
    end_location: str | None = None
    car_available: bool = False
    action_required: bool = False
    linked_event_id: str | None = None
    linked_meal_id: str | None = None
    restaurant_drivers: list[RestaurantDriver] = Field(default_factory=list)

    # Computed fields that the frontend expects
    seats_left: int = 0
    is_full: bool = False
    is_public_transport: bool = False

    @model_validator(mode="before")
    @classmethod
    def compute_fields(cls, data: Any) -> Any:
        passengers = data.get("passengers") or []
        data["passengers"] = passengers
        data["restaurant_drivers"] = data.get("restaurant_drivers") or []
        data["parking_info"] = data.get("parking_info") or ""
        data["end_location"] = data.get("end_location") or None

        vehicle = data.get("vehicle_type", "")
        total = data.get("total_seats", 0)

        data["is_public_transport"] = vehicle == "Public Transport"
        data["seats_left"] = max(0, total - len(passengers))
        data["is_full"] = data["seats_left"] <= 0 and not data["is_public_transport"]

        return data


class CreateRideRequest(BaseModel):
    direction: Literal["Inbound", "Outbound", "Restaurant"]
    vehicle_type: Literal["Car", "Public Transport"]
    driver: str = Field(min_length=1, max_length=100)
    departure_time: str = Field(min_length=1, max_length=20)
    start_location: str = Field(min_length=1, max_length=200)
    total_seats: int = Field(ge=0, le=100)
    parking_info: str | None = Field(default=None, max_length=500)
    end_location: str | None = Field(default=None, max_length=200)
    car_available: bool = False
    action_required: bool = False
    linked_event_id: str | None = None
    linked_meal_id: str | None = None


class ClaimSeatRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=100)


class RestaurantDriverRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=100)
    seats: int = Field(ge=0, le=100)


class LeaveRestaurantDriverRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=100)


class RestaurantAssignRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=100)
    driver_name: str = Field(min_length=1, max_length=100)


class RestaurantUnassignRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=100)
