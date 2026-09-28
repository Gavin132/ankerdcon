"""A member's 'download this day as zip': every photo of one event day, zipped, streamed
as it is built. Any signed-in member, not admin-only — the photos are already visible to
anyone who opens the story."""
import asyncio
import io
import zipfile

import pytest
from fastapi import HTTPException

from app.routers import stories

DAY = "22222222-2222-2222-2222-222222222222"


class _Result:
    def __init__(self, data):
        self.data = data


class _Table:
    """Supports the one chain each query in stories.py uses: select → eq → [order] → execute."""

    def __init__(self, rows):
        self.rows, self.filters = rows, {}

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.filters[col] = val
        return self

    def order(self, *_):
        return self

    def execute(self):
        rows = [r for r in self.rows if all(r.get(k) == v for k, v in self.filters.items())]
        return _Result(rows)


class FakeSupabase:
    def __init__(self, photos, days):
        self.tables = {"story_photos": photos, "event_days": days}

    def table(self, name):
        return _Table(self.tables.get(name, []))


def _photo(seq: int, who: str) -> dict:
    return {
        "id": f"p{seq}", "seq": seq, "uploaded_by": who,
        "image_url": f"https://cdn.test/story-photos/{DAY[:8]}/{DAY}/{seq}.jpg",
        "event_day_id": DAY,
    }


@pytest.fixture
def photos(monkeypatch):
    rows = [_photo(1, "Sam"), _photo(2, "Alex")]
    days = [{"id": DAY, "date": "2026-09-28"}]
    monkeypatch.setattr(stories, "supabase", FakeSupabase(rows, days))
    monkeypatch.setattr(stories.minio_client, "get_object_bytes", lambda key: (key.encode(), "image/jpeg"))
    return rows


def _read_zip(response) -> zipfile.ZipFile:
    async def collect() -> bytes:
        return b"".join([chunk async for chunk in response.body_iterator])

    return zipfile.ZipFile(io.BytesIO(asyncio.run(collect())))


def test_zip_has_one_named_file_per_photo(photos):
    response = stories.download_all_story_photos(DAY, "Sam")
    zf = _read_zip(response)
    assert sorted(zf.namelist()) == ["001-Sam.jpg", "002-Alex.jpg"]
    assert zf.read("001-Sam.jpg") == f"{DAY[:8]}/{DAY}/1.jpg".encode()


def test_filename_uses_the_days_date(photos):
    response = stories.download_all_story_photos(DAY, "Sam")
    assert response.headers["content-disposition"] == 'attachment; filename="fotos-2026-09-28.zip"'


def test_any_signed_in_member_may_download_it(photos):
    # No admin dependency on this route — just needs a current_user, whoever it is.
    stories.download_all_story_photos(DAY, "Alex")


def test_a_day_with_no_photos_is_a_404(monkeypatch):
    monkeypatch.setattr(stories, "supabase", FakeSupabase([], [{"id": DAY, "date": "2026-09-28"}]))
    with pytest.raises(HTTPException) as e:
        stories.download_all_story_photos(DAY, "Sam")
    assert e.value.status_code == 404


def test_too_many_photos_is_refused_before_it_starts(monkeypatch):
    rows = [_photo(i, "Sam") for i in range(1, stories._DAY_ZIP_MAX_FILES + 2)]
    monkeypatch.setattr(stories, "supabase", FakeSupabase(rows, [{"id": DAY, "date": "2026-09-28"}]))
    with pytest.raises(HTTPException) as e:
        stories.download_all_story_photos(DAY, "Sam")
    assert e.value.status_code == 413


def test_an_unreadable_photo_is_skipped_not_fatal(photos, monkeypatch):
    def flaky(key):
        if key.endswith("1.jpg"):
            raise OSError("gone")
        return key.encode(), "image/jpeg"

    monkeypatch.setattr(stories.minio_client, "get_object_bytes", flaky)
    zf = _read_zip(stories.download_all_story_photos(DAY, "Sam"))
    assert zf.namelist() == ["002-Alex.jpg"]


def test_missing_event_day_id_is_422():
    with pytest.raises(HTTPException) as e:
        stories.download_all_story_photos("", "Sam")
    assert e.value.status_code == 422
