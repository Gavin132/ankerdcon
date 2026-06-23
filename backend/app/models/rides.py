from pydantic import BaseModel, Field, model_validator
from typing import Any

class RestaurantDriver(BaseModel):
    name: str
    seats: int
    passengers: list[str] = Field(default_factory=list)

class Ride(BaseModel):
    id: int
    direction: str
    vehicle_type: str
    driver: str
    departure_time: str
    start_location: str
    total_seats: int = 0
    passengers: list[str] = Field(default_factory=list)
    parking_info: str | None = ""
    maps_link: str | None = ""
    car_available: bool = False
    action_required: bool = False
    restaurant_drivers: list[RestaurantDriver] = Field(default_factory=list)
    
    # Computed fields that the frontend expects
    seats_left: int = 0
    is_full: bool = False
    is_public_transport: bool = False

    @model_validator(mode='before')
    @classmethod
    def compute_fields(cls, data: Any) -> Any:
        # Clean nulls from Supabase
        passengers = data.get('passengers') or []
        data['passengers'] = passengers
        data['restaurant_drivers'] = data.get('restaurant_drivers') or []
        data['parking_info'] = data.get('parking_info') or ""
        data['maps_link'] = data.get('maps_link') or ""
        
        # Compute the frontend logic dynamically
        vehicle = data.get('vehicle_type', '')
        total = data.get('total_seats', 0)
        
        data['is_public_transport'] = (vehicle == "Public Transport")
        data['seats_left'] = max(0, total - len(passengers))
        data['is_full'] = data['seats_left'] <= 0 and not data['is_public_transport']
        
        return data

class CreateRideRequest(BaseModel):
    direction: str
    vehicle_type: str
    driver: str
    departure_time: str
    start_location: str
    total_seats: int
    parking_info: str | None = None
    maps_link: str | None = None
    car_available: bool = False
    action_required: bool = False

class ClaimSeatRequest(BaseModel):
    user_name: str

class RestaurantDriverRequest(BaseModel):
    user_name: str
    seats: int

class LeaveRestaurantDriverRequest(BaseModel):
    user_name: str

class RestaurantAssignRequest(BaseModel):
    user_name: str
    driver_name: str

class RestaurantUnassignRequest(BaseModel):
    user_name: str