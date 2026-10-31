"""Videos in a story: stored as they come, with the still frame the phone made of them.
What the bytes really are is checked, whatever the browser called the file."""
import io

import pytest
from fastapi import HTTPException
from PIL import Image

from app.models.story import StoryPhoto
from app.routers import stories

DAY = "22222222-2222-2222-2222-222222222222"
EVENT = "11111111-1111-1111-1111-111111111111"
MP4 = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + b"\x00" * 64


def _jpeg() -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(out, "JPEG")
    return out.getvalue()


class _Result:
    def __init__(self, data):
        self.data = data


class _Table:
    def __init__(self, db, name):
        self.db, self.name, self.op = db, name, None

    def select(self, *_):
        return self

    def eq(self, *_):
        return self

    def insert(self, row):
        self.op = ("insert", row)
        return self

    def execute(self):
        if self.name == "event_days":
            return _Result([{"event_id": EVENT}])
        kind, row = self.op
        self.db.inserted.append(row)
        return _Result([{**row, "id": "p1", "seq": 1, "created_at": "2026-10-15T10:00:00"}])


class FakeSupabase:
    def __init__(self):
        self.inserted = []

    def table(self, name):
        return _Table(self, name)


@pytest.fixture
def stored(monkeypatch):
    db = FakeSupabase()
    uploads = {}
    monkeypatch.setattr(stories, "supabase", db)
    monkeypatch.setattr(
        stories.minio_client, "upload_bytes",
        lambda key, content, ctype: uploads.setdefault(key, (content, ctype)) and f"https://cdn.test/b/{key}",
    )
    return db, uploads


def test_video_is_stored_untouched_with_its_poster(stored):
    db, uploads = stored
    row = stories._store_story_photo(DAY, "Sam", MP4, _jpeg())

    video_key = next(k for k in uploads if k.endswith(".mp4"))
    assert uploads[video_key] == (MP4, "video/mp4")
    assert any(k.endswith(".poster.jpg") for k in uploads)
    assert row["image_url"].endswith(".mp4") and row["poster_url"].endswith(".poster.jpg")
    assert StoryPhoto(**row).media_type == "video"


def test_photo_has_no_poster_and_stays_an_image(stored):
    db, _ = stored
    row = stories._store_story_photo(DAY, "Sam", _jpeg())
    assert "poster_url" not in db.inserted[0]
    assert StoryPhoto(**row).media_type == "image"


def test_something_that_is_not_a_video_is_refused(stored):
    _, uploads = stored
    with pytest.raises(HTTPException) as err:
        stories._store_story_photo(DAY, "Sam", b"<html>not a video</html>" + b"\x00" * 64, _jpeg())
    assert err.value.status_code == 415
    assert uploads == {}
