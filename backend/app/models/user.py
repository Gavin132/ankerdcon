from typing import Literal, Optional
from pydantic import BaseModel, field_validator


class User(BaseModel):
    id: str
    name: str
    row_number: Optional[int] = None # Added this since it's missing
    phone_number: Optional[str] = None
    hotel_room: Optional[str] = None
    live_location_ping: Optional[str] = None
    passcode: Optional[str] = None
    color: Optional[str] = None
    font: Optional[str] = None
    pronouns: Optional[str] = None
    bio: Optional[str] = None
    banner_color: Optional[str] = None
    banner_url: Optional[str] = None
    discord_id: Optional[str] = None

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
