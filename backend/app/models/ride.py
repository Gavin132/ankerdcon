from pydantic import BaseModel


class Ride(BaseModel):
    row_number: int
    direction: str
    vehicle_type: str
    driver: str
    departure_time: str
    start_location: str
    total_seats: int
    passengers: list[str]
    parking_info: str = ""
    maps_link: str = ""
    car_available: bool = False
    action_required: bool = False
    # Computed on read
    seats_left: int
    is_full: bool
    is_public_transport: bool


class CreateRideRequest(BaseModel):
    direction: str
    vehicle_type: str
    driver: str
    departure_time: str
    start_location: str
    total_seats: int = 4
    parking_info: str = ""
    maps_link: str = ""
    car_available: bool = False
    action_required: bool = False


class ClaimSeatRequest(BaseModel):
    user_name: str


class LeaveSeatRequest(BaseModel):
    user_name: str
