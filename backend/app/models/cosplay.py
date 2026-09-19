from __future__ import annotations

from typing import Optional

from pydantic import BaseModel
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


class CreateCosplayRequest(BaseModel):
    user_name: str
    character_name: str
    series: Optional[str] = None
    notes: Optional[str] = None
    inspo_images: list[RequiredImageUrl] = []
    linked_event_ids: list[str]
