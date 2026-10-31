from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, computed_field

VIDEO_EXTENSIONS = (".mp4", ".mov", ".webm")


def media_type_of(url: str) -> str:
    """"video" or "image", from the name of the stored file (no column: the name says it)."""
    return "video" if url.lower().split("?", 1)[0].endswith(VIDEO_EXTENSIONS) else "image"


class StoryPhoto(BaseModel):
    id: str
    event_day_id: str
    seq: int
    uploaded_by: str
    image_url: str
    poster_url: Optional[str] = None
    # Lighter copies for grids (thumb_url) and the story viewer (preview_url, only for a big photo);
    # None for what was added before they existed. The original is `image_url`.
    thumb_url: Optional[str] = None
    preview_url: Optional[str] = None
    created_at: str
    # Only for a photo of a day with no event day of its own (see migration v2.43); None for a photo of the event day.
    taken_on: Optional[str] = None

    @computed_field
    @property
    def media_type(self) -> str:
        return media_type_of(self.image_url)


class StorySeenState(BaseModel):
    event_day_id: str
    last_seen_seq: int


class MarkStorySeenRequest(BaseModel):
    seq: int


class StoryExtraDay(BaseModel):
    """A day just before or after an event that only has photos: no event day, so no ring and no seen marker."""
    date: str
    photo_count: int
    preview_url: str


class StoryDaySummary(BaseModel):
    """The photos of one event day. `photo_count` is the day itself; photos of the days around it are in `extra_days`."""
    photo_count: int
    latest_seq: int
    has_unseen: bool
    preview_url: str
    extra_days: list[StoryExtraDay] = []


class UserStoryPhoto(BaseModel):
    """A photo on someone's profile: the photo plus which event it was taken at."""
    id: str
    image_url: str
    poster_url: Optional[str] = None
    thumb_url: Optional[str] = None
    preview_url: Optional[str] = None
    created_at: str
    event_day_id: str
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    date: Optional[str] = None

    @computed_field
    @property
    def media_type(self) -> str:
        return media_type_of(self.image_url)
