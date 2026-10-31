"""Photos of a day just before or after an event: kept on the nearest event day with the date they were
taken, shown as a day of their own, and never counted as (or hidden in) the event day itself."""
import io

import pytest
from fastapi import HTTPException
from PIL import Image

from app.routers import stories

DAY = "22222222-2222-2222-2222-222222222222"
EVENT = "11111111-1111-1111-1111-111111111111"


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

    def in_(self, *_):
        return self

    def order(self, *_):
        return self

    def insert(self, row):
        self.op = row
        return self

    def execute(self):
        if self.op is not None:
            # A database without migration v2.43 refuses the column.
            if "taken_on" in self.op and self.db.no_taken_on_column:
                raise RuntimeError("column taken_on does not exist")
            self.db.inserted.append(self.op)
            return _Result([{**self.op, "id": "p1", "seq": 1, "created_at": "2026-10-15T10:00:00"}])
        if self.name == "event_days":
            return _Result([{"event_id": EVENT, "date": "2026-11-21"}])
        if self.name == "story_seen":
            return _Result([])
        return _Result(self.db.photos)


class FakeSupabase:
    def __init__(self, photos=None, no_taken_on_column=False):
        self.photos, self.inserted, self.no_taken_on_column = photos or [], [], no_taken_on_column

    def table(self, name):
        return _Table(self, name)


def _photo(seq, taken_on=None):
    return {
        "id": f"p{seq}", "seq": seq, "uploaded_by": "Sam", "event_day_id": DAY, "taken_on": taken_on,
        "image_url": f"https://cdn.test/b/{seq}.jpg", "thumb_url": f"https://cdn.test/b/{seq}.thumb.webp",
        "created_at": "2026-10-15T10:00:00",
    }


class TestCleanTakenOn:
    def test_the_day_itself_needs_no_date(self):
        assert stories._clean_taken_on("2026-11-21", "2026-11-21") is None
        assert stories._clean_taken_on(None, "2026-11-21") is None

    def test_the_day_before_or_after_is_kept(self):
        assert stories._clean_taken_on("2026-11-20", "2026-11-21") == "2026-11-20"
        assert stories._clean_taken_on("2026-11-22", "2026-11-21") == "2026-11-22"

    def test_further_away_is_refused(self):
        with pytest.raises(HTTPException) as err:
            stories._clean_taken_on("2026-11-19", "2026-11-21")
        assert err.value.status_code == 422

    def test_a_date_that_is_no_date_is_refused(self):
        with pytest.raises(HTTPException) as err:
            stories._clean_taken_on("gisteren", "2026-11-21")
        assert err.value.status_code == 422


def test_summary_counts_the_day_and_lists_the_days_around_it_apart(monkeypatch):
    photos = [_photo(1), _photo(2), _photo(3, "2026-11-20"), _photo(4, "2026-11-20"), _photo(5, "2026-11-22")]
    monkeypatch.setattr(stories, "supabase", FakeSupabase(photos))

    summary = stories.get_story_summary(DAY, "Sam")[DAY]

    assert summary.photo_count == 2 and summary.latest_seq == 2 and summary.has_unseen
    assert [(d.date, d.photo_count) for d in summary.extra_days] == [("2026-11-20", 2), ("2026-11-22", 1)]


def test_a_day_that_only_has_photos_around_it_has_no_story_of_its_own(monkeypatch):
    monkeypatch.setattr(stories, "supabase", FakeSupabase([_photo(7, "2026-11-20")]))

    summary = stories.get_story_summary(DAY, "Sam")[DAY]

    assert summary.photo_count == 0 and not summary.has_unseen and summary.preview_url == ""
    assert summary.extra_days[0].photo_count == 1


def test_list_gives_the_day_or_one_extra_day(monkeypatch):
    monkeypatch.setattr(stories, "supabase", FakeSupabase([_photo(1), _photo(2, "2026-11-20"), _photo(3, "2026-11-22")]))

    assert [p["id"] for p in stories.list_story_photos(DAY, None, "Sam")] == ["p1"]
    assert [p["id"] for p in stories.list_story_photos(DAY, "2026-11-20", "Sam")] == ["p2"]


def _store(db, monkeypatch, taken_on):
    monkeypatch.setattr(stories, "supabase", db)
    monkeypatch.setattr(stories.minio_client, "upload_bytes", lambda key, content, ctype: f"https://cdn.test/b/{key}")
    return stories._store_story_photo(DAY, "Sam", _jpeg(), taken_on=taken_on)


def test_a_photo_of_the_day_before_keeps_its_date(monkeypatch):
    db = FakeSupabase()
    row = _store(db, monkeypatch, "2026-11-20")
    assert row["taken_on"] == "2026-11-20" and db.inserted[0]["taken_on"] == "2026-11-20"


def test_a_photo_of_the_day_itself_keeps_no_date(monkeypatch):
    db = FakeSupabase()
    _store(db, monkeypatch, "2026-11-21")
    assert "taken_on" not in db.inserted[0]


def test_a_date_too_far_away_stores_nothing(monkeypatch):
    db = FakeSupabase()
    uploaded = []
    monkeypatch.setattr(stories, "supabase", db)
    monkeypatch.setattr(stories.minio_client, "upload_bytes", lambda *a: uploaded.append(a))
    with pytest.raises(HTTPException) as err:
        stories._store_story_photo(DAY, "Sam", _jpeg(), taken_on="2026-11-10")
    assert err.value.status_code == 422 and uploaded == [] and db.inserted == []


def test_before_the_migration_the_photo_is_still_saved_on_the_nearest_day(monkeypatch):
    db = FakeSupabase(no_taken_on_column=True)
    row = _store(db, monkeypatch, "2026-11-20")
    assert "taken_on" not in db.inserted[0]
    # Only the missing column is dropped: the lighter copies are kept.
    assert db.inserted[0].get("thumb_url") and row["event_day_id"] == DAY
