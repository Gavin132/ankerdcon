from __future__ import annotations

from typing import Optional
from pydantic import BaseModel
from app.core.validation import ImageUrl, RequiredImageUrl


class Badge(BaseModel):
    id: str
    name: str
    description: str
    image_url: str
    display_order: int = 0


class CreateBadgeRequest(BaseModel):
    name: str
    description: str
    image_url: RequiredImageUrl
    display_order: int = 0


class UpdateBadgeRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: ImageUrl = None
    display_order: Optional[int] = None


class BadgeOrderItem(BaseModel):
    id: str
    display_order: int
