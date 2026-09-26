from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field
from app.core.validation import RequiredImageUrl


class Cosplay(BaseModel):
    id: str
    user_name: str
    character_name: str
    series: Optional[str] = None
    notes: Optional[str] = None
    inspo_images: list[str] = []
    linked_event_ids: list[str] = []
    created_at: str


# Inspiration images per cosplay. The form stops at this many; the API enforces
# it too so nothing else can pile on more.
MAX_INSPO_IMAGES = 3


class CreateCosplayRequest(BaseModel):
    user_name: str
    character_name: str
    series: Optional[str] = None
    notes: Optional[str] = None
    inspo_images: list[RequiredImageUrl] = Field(default_factory=list, max_length=MAX_INSPO_IMAGES)
    linked_event_ids: list[str]
