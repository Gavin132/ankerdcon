from typing import Literal, Optional
from pydantic import BaseModel, field_validator


class User(BaseModel):
    row_number: int
    name: str
    phone_number: str = ""
    hotel_room: str = ""
    live_location_ping: str = ""
    color: str = ""
    font: str = ""
    bio: str = ""
    banner_color: str = ""
    pronouns: str = ""


class LocationPingRequest(BaseModel):
    zone: str
    text: str


class UpdatePreferencesRequest(BaseModel):
    color: Optional[str] = None
    font: Optional[Literal["default", "mono", "serif", "cursive", "display"]] = None
    bio: Optional[str] = None
    banner_color: Optional[str] = None
    pronouns: Optional[str] = None

    @field_validator("color", "banner_color")
    @classmethod
    def valid_hex(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not (v.startswith("#") and len(v) in (4, 7)):
            raise ValueError("Kleur moet een geldig hex-formaat zijn (#rgb of #rrggbb)")
        return v

    @field_validator("bio")
    @classmethod
    def max_bio_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 200:
            raise ValueError("Bio mag maximaal 200 tekens bevatten")
        return v

    @field_validator("pronouns")
    @classmethod
    def max_pronouns_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 40:
            raise ValueError("Voornaamwoorden mogen maximaal 40 tekens bevatten")
        return v
