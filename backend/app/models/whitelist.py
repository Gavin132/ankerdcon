from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, model_validator


class WhitelistEntry(BaseModel):
    id: str
    discord_id: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None


class CreateWhitelistEntryRequest(BaseModel):
    discord_id: Optional[str] = None
    email: Optional[str] = None

    @model_validator(mode="after")
    def _require_one_identifier(self) -> "CreateWhitelistEntryRequest":
        self.discord_id = (self.discord_id or "").strip() or None
        self.email = (self.email or "").strip().lower() or None
        if not self.discord_id and not self.email:
            raise ValueError("Geef een Discord ID of e-mailadres op.")
        return self
