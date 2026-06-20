from pydantic import BaseModel


class Meal(BaseModel):
    row_number: int
    meal_name: str
    time: str
    location: str = ""
    cost: str = ""
    rsvps: list[str]
    transport_needed: bool


class CreateMealRequest(BaseModel):
    meal_name: str
    time: str
    location: str = ""
    cost: str = ""
    transport_needed: bool = False


class RsvpRequest(BaseModel):
    user_name: str
