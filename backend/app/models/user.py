import re
from typing import Literal, Optional
from pydantic import BaseModel, field_validator


class User(BaseModel):
    id: str
    name: str
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
    banner_position: Optional[str] = None
    discord_id: Optional[str] = None
    discord_username: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True
    is_first_login: bool = True
    onboarding_completed: bool = False
    allow_dm: bool = True
    show_greeting: bool = True
    aliases: list[str] = []
    badge_ids: list[str] = []
    notification_categories: list[str] = []
    created_at: Optional[str] = None

class UpdateNameRequest(BaseModel):
    new_name: str

    @field_validator("new_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 30:
            raise ValueError("Naam moet tussen 2 en 30 tekens zijn")
        if not re.match(r"^[\w\s\-\.]+$", v, re.UNICODE):
            raise ValueError("Naam mag alleen letters, cijfers, spaties, koppeltekens en punten bevatten")
        return v


class LocationPingRequest(BaseModel):
    zone: str
    text: str


class UpdatePreferencesRequest(BaseModel):
    color: Optional[str] = None
    font: Optional[Literal["default", "mono", "serif", "cursive", "display"]] = None
    bio: Optional[str] = None
    banner_color: Optional[str] = None
    banner_position: Optional[str] = None
    pronouns: Optional[str] = None
    phone_number: Optional[str] = None
    aliases: Optional[list[str]] = None
    allow_dm: Optional[bool] = None
    show_greeting: Optional[bool] = None
    notification_categories: Optional[list[str]] = None

    @field_validator("notification_categories")
    @classmethod
    def valid_categories(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        from app.services.notification_service import ALL_CATEGORIES
        invalid = [c for c in v if c not in ALL_CATEGORIES]
        if invalid:
            raise ValueError(f"Onbekende notificatiecategorie: {', '.join(invalid)}")
        return v

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

    @field_validator("phone_number")
    @classmethod
    def valid_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        stripped = re.sub(r"[\s\-().]", "", v.strip())
        if not re.match(r"^\+?[0-9]{7,15}$", stripped):
            raise ValueError("Voer een geldig telefoonnummer in (bijv. +31 6 12345678)")
        return v.strip()


class CompleteOnboardingRequest(BaseModel):
    pronouns: Optional[str] = None
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    color: Optional[str] = None
    banner_color: Optional[str] = None
    allow_dm: bool = True
    aliases: Optional[list[str]] = None
    notification_categories: Optional[list[str]] = None

    @field_validator("notification_categories")
    @classmethod
    def valid_categories(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        from app.services.notification_service import ALL_CATEGORIES
        invalid = set(v) - set(ALL_CATEGORIES)
        if invalid:
            raise ValueError(f"Onbekende notificatiecategorie(ën): {', '.join(sorted(invalid))}")
        return v

    @field_validator("color", "banner_color")
    @classmethod
    def valid_hex(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if v and not (v.startswith("#") and len(v) in (4, 7)):
            raise ValueError("Kleur moet een geldig hex-formaat zijn (#rgb of #rrggbb)")
        return v
