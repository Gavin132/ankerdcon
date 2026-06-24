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


class CreateMealRequest(BaseModel):
    meal_name: str
    time: str
    location: str = ""
    cost: str = ""
    transport_needed: bool = False


class RsvpRequest(BaseModel):
    user_name: str
