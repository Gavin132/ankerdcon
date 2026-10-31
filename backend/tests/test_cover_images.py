"""Event covers are stored light: at most 1600 px of WebP, whatever size the camera made them."""
import io
from types import SimpleNamespace

import pytest
from PIL import Image

from app.core.uploads import shrink_image
from app.routers import admin
from app.services import cover_shrink

BUCKET = "story-photos"


def photo(width, height, fmt="JPEG", quality=92) -> bytes:
    out = io.BytesIO()
    Image.effect_noise((width, height), 60).convert("RGB").save(out, fmt, quality=quality)
    return out.getvalue()


def size_of(data: bytes) -> tuple[int, int]:
    return Image.open(io.BytesIO(data)).size


def test_a_big_camera_photo_becomes_a_light_webp():
    original = photo(4000, 3000)
    data, content_type, ext = shrink_image(original, max_side=1600)
    assert (content_type, ext) == ("image/webp", "webp")
    assert size_of(data) == (1600, 1200)
    assert len(data) < len(original) / 3


def test_a_light_small_image_is_left_alone():
    assert shrink_image(photo(800, 600, quality=60), max_side=1600) is None


def test_a_small_picture_that_is_heavy_in_bytes_is_recompressed_not_enlarged():
    heavy = photo(1500, 1000, quality=100)
    assert len(heavy) > 400 * 1024
    data, _, _ = shrink_image(heavy, max_side=1600)
    assert size_of(data) == (1500, 1000) and len(data) < len(heavy)


def test_a_picture_already_compact_is_not_squeezed_a_second_time():
    out = io.BytesIO()
    Image.new("RGB", (1500, 1000), "white").save(out, "WEBP", quality=50)
    assert shrink_image(out.getvalue(), max_side=1600, keep_under=100) is None


def test_transparency_survives():
    out = io.BytesIO()
    Image.new("RGBA", (3000, 2000), (255, 0, 0, 0)).save(out, "PNG")
    data, _, _ = shrink_image(out.getvalue(), max_side=1600)
    assert Image.open(io.BytesIO(data)).mode == "RGBA"


def test_the_cover_route_shrinks_a_cover_but_not_a_badge(monkeypatch):
    stored = {}
    monkeypatch.setattr(admin.minio_client, "upload_bytes", lambda key, data, ctype: stored.setdefault(key, (data, ctype)) and f"https://cdn.test/{key}")
    big = photo(3000, 2000)

    admin._store_admin_image("event-cover", "event-covers", big)
    admin._store_admin_image("badge", "badges", big)
    cover = next(v for k, v in stored.items() if k.startswith("event-covers/"))
    badge = next(v for k, v in stored.items() if k.startswith("badges/"))
    assert cover[1] == "image/webp" and max(size_of(cover[0])) == 1600
    assert badge[0] == big  # a badge keeps its own size and format


# ── The covers already uploaded ──────────────────────────────────────────────


class _Table:
    def __init__(self, db):
        self.db, self.payload, self.filters = db, None, {}

    def select(self, *_):
        return self

    def update(self, payload):
        self.payload = payload
        return self

    def eq(self, col, val):
        self.filters[col] = val
        return self

    def execute(self):
        if self.payload is not None:
            self.db.updates.append((self.filters["id"], self.payload))
            return SimpleNamespace(data=[])
        return SimpleNamespace(data=self.db.events)


class FakeDb:
    def __init__(self, events):
        self.events, self.updates = events, []

    def table(self, _name):
        return _Table(self)


@pytest.fixture
def world(monkeypatch):
    objects = {
        "event-covers/big.jpg": photo(4000, 3000),
        "event-covers/small.jpg": photo(600, 400, quality=50),
    }
    stored, removed = {}, []
    db = FakeDb([
        {"id": "e1", "event_name": "Big con", "image_url": f"https://cdn.test/{BUCKET}/event-covers/big.jpg"},
        {"id": "e2", "event_name": "Small con", "image_url": f"https://cdn.test/{BUCKET}/event-covers/small.jpg"},
        {"id": "e3", "event_name": "No cover", "image_url": None},
        {"id": "e4", "event_name": "Elsewhere", "image_url": "https://example.com/x.jpg"},
    ])
    monkeypatch.setattr(cover_shrink, "supabase", db)
    monkeypatch.setattr(cover_shrink, "get_settings", lambda: SimpleNamespace(minio_bucket=BUCKET))
    monkeypatch.setattr(cover_shrink.minio_client, "get_object_bytes", lambda key: (objects[key], "image/jpeg"))
    monkeypatch.setattr(cover_shrink.minio_client, "upload_bytes", lambda key, data, ctype: stored.setdefault(key, data) and f"https://cdn.test/{BUCKET}/{key}")
    monkeypatch.setattr(cover_shrink.minio_client, "delete_object", lambda key: removed.append(key))
    return db, stored, removed


def test_only_a_heavy_cover_is_shrunk_and_the_event_points_at_the_new_file(world):
    db, stored, removed = world
    done = cover_shrink.shrink_covers()
    assert [d["event"] for d in done] == ["Big con"]
    assert done[0]["after"] < done[0]["before"] / 3
    assert len(stored) == 1 and next(iter(stored)).startswith("event-covers/") and next(iter(stored)).endswith(".webp")
    assert db.updates == [("e1", {"image_url": f"https://cdn.test/{BUCKET}/{next(iter(stored))}"})]
    assert removed == []  # the old file stays unless asked


def test_a_dry_run_changes_nothing(world):
    db, stored, _ = world
    assert len(cover_shrink.shrink_covers(dry_run=True)) == 1
    assert stored == {} and db.updates == []


def test_the_old_file_can_be_removed(world):
    _, _, removed = world
    cover_shrink.shrink_covers(delete_old=True)
    assert removed == ["event-covers/big.jpg"]
