from __future__ import annotations

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
