from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ChangelogEntry(BaseModel):
    id: str
    title: str
    items: list[str] = []
    released_at: str
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None


class CreateChangelogEntryRequest(BaseModel):
    title: str
    items: list[str] = []
    released_at: str


class UpdateChangelogEntryRequest(BaseModel):
    title: Optional[str] = None
    items: Optional[list[str]] = None
    released_at: Optional[str] = None
