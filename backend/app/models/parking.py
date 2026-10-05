from __future__ import annotations

from pydantic import BaseModel, Field


class ParkingSpot(BaseModel):
    id: str
    trip_id: str
    driver: str
    lat: float
    lng: float
    placed_by: str
    created_at: str | None = None


class SetParkingSpotRequest(BaseModel):
    driver: str = Field(min_length=1, max_length=100)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
