from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class StoryPhoto(BaseModel):
    id: str
    event_day_id: str
    seq: int
    uploaded_by: str
    image_url: str
    created_at: str


class StorySeenState(BaseModel):
    event_day_id: str
    last_seen_seq: int


class MarkStorySeenRequest(BaseModel):
    seq: int


class StoryDaySummary(BaseModel):
    photo_count: int
    latest_seq: int
    has_unseen: bool
    preview_url: str


class UserStoryPhoto(BaseModel):
    """A photo on someone's profile: the photo plus which event it was taken at."""
    id: str
    image_url: str
    created_at: str
    event_day_id: str
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    date: Optional[str] = None
