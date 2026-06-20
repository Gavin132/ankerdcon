from pydantic import BaseModel


class User(BaseModel):
    row_number: int
    name: str
    phone_number: str = ""
    hotel_room: str = ""
    live_location_ping: str = ""


class LocationPingRequest(BaseModel):
    zone: str
    text: str
