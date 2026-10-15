"""Thumbnails and previews of story photos: lighter copies for grids and the viewer, the original untouched."""
import io
from types import SimpleNamespace

import pytest
from PIL import Image

from app.core.thumbnails import derivative_urls, is_derivative, make_derivatives
from app.models.story import StoryPhoto
from app.routers import admin, stories
from app.services import story_previews

DAY = "22222222-2222-2222-2222-222222222222"
EVENT = "11111111-1111-1111-1111-111111111111"
BUCKET = "story-photos"


def jpeg(width, height, color="red") -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (width, height), color).save(out, "JPEG", quality=90)
    return out.getvalue()


def size_of(data: bytes) -> tuple[int, int]:
    return Image.open(io.BytesIO(data)).size


# ── The pictures ─────────────────────────────────────────────────────────────


def test_a_big_photo_gets_a_thumbnail_and_a_preview():
    thumb, preview = make_derivatives(jpeg(2560, 1920))
    assert size_of(thumb) == (480, 360)
    assert size_of(preview) == (1280, 960)
    assert Image.open(io.BytesIO(thumb)).format == "WEBP"


def test_the_copies_are_far_lighter_than_the_original():
    original = io.BytesIO()
    Image.effect_noise((2560, 1920), 60).convert("RGB").save(original, "JPEG", quality=88)
    thumb, preview = make_derivatives(original.getvalue())
    assert len(thumb) < len(original.getvalue()) / 10
    assert len(preview) < len(original.getvalue()) / 2


@pytest.mark.parametrize("width", [1500, 1000, 300])
def test_a_photo_not_much_bigger_than_a_preview_is_its_own_preview(width):
    thumb, preview = make_derivatives(jpeg(width, width // 2))
    assert preview is None
    assert max(size_of(thumb)) <= 480


def test_a_small_photo_is_not_enlarged():
    thumb, _ = make_derivatives(jpeg(200, 100))
    assert size_of(thumb) == (200, 100)


def test_the_orientation_in_the_photo_is_kept():
    exif = Image.Exif()
    exif[0x0112] = 6  # stored sideways, to be shown rotated
    out = io.BytesIO()
    Image.new("RGB", (600, 300), "blue").save(out, "JPEG", exif=exif.tobytes())
    thumb, _ = make_derivatives(out.getvalue())
    assert size_of(thumb) == (240, 480)


def test_transparency_goes_on_white_not_black():
    out = io.BytesIO()
    Image.new("RGBA", (100, 100), (0, 0, 0, 0)).save(out, "PNG")
    thumb, _ = make_derivatives(out.getvalue())
    pixel = Image.open(io.BytesIO(thumb)).convert("RGB").getpixel((50, 50))
    assert min(pixel) > 240


def test_a_preview_can_be_left_out():
    assert make_derivatives(jpeg(3000, 2000), preview=False)[1] is None


# ── Naming ───────────────────────────────────────────────────────────────────


def test_derivative_files_are_told_apart_from_photos():
    assert is_derivative("e/d/abc.thumb.webp") and is_derivative("e/d/abc.preview.webp") and is_derivative("e/d/abc.poster.jpg")
    assert not is_derivative("e/d/abc.jpg") and not is_derivative("e/d/abc.mp4")


def test_derivative_urls_lists_only_what_exists():
    row = {"image_url": "u", "thumb_url": "t", "preview_url": None, "poster_url": "p"}
    assert derivative_urls(row) == ["p", "t"]


# ── Uploading ────────────────────────────────────────────────────────────────


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
        row = self.op[1]
        if self.db.reject_columns and any(c in row for c in self.db.reject_columns):
            raise RuntimeError("column does not exist")
        self.db.inserted.append(row)
        return _Result([{**row, "id": "p1", "seq": 1, "created_at": "2026-10-15T10:00:00"}])


class FakeSupabase:
    def __init__(self, reject_columns=()):
        self.inserted, self.reject_columns = [], reject_columns

    def table(self, name):
        return _Table(self, name)


@pytest.fixture
def storage(monkeypatch):
    uploads, removed = {}, []
    monkeypatch.setattr(stories.minio_client, "upload_bytes", lambda key, data, ctype: uploads.setdefault(key, (data, ctype)) and f"https://cdn.test/{BUCKET}/{key}")
    monkeypatch.setattr(stories.minio_client, "delete_object", lambda key: removed.append(key))
    monkeypatch.setattr(stories, "get_settings", lambda: SimpleNamespace(minio_bucket=BUCKET))
    return uploads, removed


def test_a_big_photo_is_stored_with_its_thumbnail_and_preview(monkeypatch, storage):
    uploads, _ = storage
    db = FakeSupabase()
    monkeypatch.setattr(stories, "supabase", db)
    row = stories._store_story_photo(DAY, "Sam", jpeg(2560, 1920))
    keys = sorted(uploads)
    assert [k.rsplit(".", 2)[-2:] for k in keys if k.endswith(".webp")] == [["preview", "webp"], ["thumb", "webp"]]
    assert row["thumb_url"].endswith(".thumb.webp") and row["preview_url"].endswith(".preview.webp")
    assert StoryPhoto(**row).media_type == "image"
    # The original is stored as it came.
    original = next(k for k in keys if k.endswith(".jpg"))
    assert size_of(uploads[original][0]) == (2560, 1920)


def test_a_small_photo_has_a_thumbnail_but_no_preview(monkeypatch, storage):
    db = FakeSupabase()
    monkeypatch.setattr(stories, "supabase", db)
    stories._store_story_photo(DAY, "Sam", jpeg(800, 600))
    assert "thumb_url" in db.inserted[0] and "preview_url" not in db.inserted[0]


def test_a_video_gets_its_thumbnail_from_the_poster(monkeypatch, storage):
    uploads, _ = storage
    db = FakeSupabase()
    monkeypatch.setattr(stories, "supabase", db)
    mp4 = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + b"\x00" * 64
    row = stories._store_story_photo(DAY, "Sam", mp4, jpeg(1280, 720))
    assert row["poster_url"].endswith(".poster.jpg") and row["thumb_url"].endswith(".thumb.webp")
    assert "preview_url" not in row
    thumb = next(v for k, v in uploads.items() if k.endswith(".thumb.webp"))
    assert size_of(thumb[0]) == (480, 270)


def test_a_database_without_the_columns_still_takes_the_photo(monkeypatch, storage):
    """Migration v2.41 not run yet: the photo is saved without its lighter copies, which are cleaned up."""
    _, removed = storage
    db = FakeSupabase(reject_columns=("thumb_url", "preview_url"))
    monkeypatch.setattr(stories, "supabase", db)
    row = stories._store_story_photo(DAY, "Sam", jpeg(2560, 1920))
    assert "thumb_url" not in db.inserted[0] and "thumb_url" not in row
    assert sorted(k.rsplit(".", 2)[-2] for k in removed) == ["preview", "thumb"]


def test_a_failed_save_removes_everything_that_was_stored(monkeypatch, storage):
    _, removed = storage

    class Down(FakeSupabase):
        def table(self, name):
            if name == "story_photos":
                raise RuntimeError("db down")
            return super().table(name)

    monkeypatch.setattr(stories, "supabase", Down())
    with pytest.raises(Exception):
        stories._store_story_photo(DAY, "Sam", jpeg(2560, 1920))
    assert len(removed) == 3  # the photo, its thumbnail and its preview


# ── Showing and removing ─────────────────────────────────────────────────────


def test_the_story_ring_shows_the_thumbnail_not_the_photo(monkeypatch):
    class Table:
        def __init__(self, name):
            self.name = name

        def select(self, *_):
            return self

        def in_(self, *_):
            return self

        def eq(self, *_):
            return self

        def execute(self):
            rows = {
                "story_photos": [{"event_day_id": "d", "seq": 2, "image_url": "big.jpg", "thumb_url": "small.webp"},
                                 {"event_day_id": "d", "seq": 1, "image_url": "old.jpg"}],
                "story_seen": [],
            }[self.name]
            return _Result(rows)

    monkeypatch.setattr(stories, "supabase", SimpleNamespace(table=lambda name: Table(name)))
    summary = stories.get_story_summary(event_day_ids="d", current_user="Sam")
    assert summary["d"].preview_url == "small.webp"


def test_an_older_photo_without_a_thumbnail_still_shows_in_the_ring(monkeypatch):
    class Table:
        def __init__(self, name):
            self.name = name

        def select(self, *_):
            return self

        def in_(self, *_):
            return self

        def eq(self, *_):
            return self

        def execute(self):
            return _Result([{"event_day_id": "d", "seq": 1, "image_url": "old.jpg"}] if self.name == "story_photos" else [])

    monkeypatch.setattr(stories, "supabase", SimpleNamespace(table=lambda name: Table(name)))
    assert stories.get_story_summary(event_day_ids="d", current_user="Sam")["d"].preview_url == "old.jpg"


def test_deleting_a_photo_removes_its_lighter_copies_too(monkeypatch, storage):
    _, removed = storage
    photo = {
        "id": "p1", "uploaded_by": "Sam", "image_url": f"https://cdn.test/{BUCKET}/e/d/a.jpg",
        "thumb_url": f"https://cdn.test/{BUCKET}/e/d/a.thumb.webp", "preview_url": f"https://cdn.test/{BUCKET}/e/d/a.preview.webp",
    }

    class Table:
        op = "select"

        def select(self, *_):
            return self

        def delete(self):
            self.op = "delete"
            return self

        def eq(self, *_):
            return self

        def execute(self):
            return _Result([photo] if self.op == "select" else [])

    monkeypatch.setattr(stories, "supabase", SimpleNamespace(table=lambda name: Table()))
    stories.delete_story_photo("p1", "Sam")
    assert removed == ["e/d/a.jpg", "e/d/a.thumb.webp", "e/d/a.preview.webp"]


# ── The admin CDN page ───────────────────────────────────────────────────────


def test_the_cdn_page_does_not_list_the_lighter_copies(monkeypatch):
    base = f"{EVENT}/{DAY}/abc"
    objects = [{"key": f"{base}{s}", "url": "u", "size": 1, "last_modified": "x"} for s in (".jpg", ".thumb.webp", ".preview.webp", ".poster.jpg")]
    monkeypatch.setattr(admin.minio_client, "list_all_objects", lambda: (objects, False))
    listed, _ = admin._cdn_objects(None, None)
    assert [o["key"] for o in listed] == [f"{base}.jpg"]


def test_deleting_a_story_photo_from_the_cdn_page_removes_its_lighter_copies(monkeypatch):
    removed = []
    photo = {"image_url": f"https://cdn.test/{BUCKET}/e/d/a.jpg", "thumb_url": f"https://cdn.test/{BUCKET}/e/d/a.thumb.webp"}

    class Table:
        def __init__(self, name):
            self.name, self.op = name, "select"

        def select(self, *_):
            return self

        def delete(self):
            self.op = "delete"
            return self

        def update(self, *_):
            self.op = "update"
            return self

        def eq(self, *_):
            return self

        def overlaps(self, *_):
            return self

        def execute(self):
            return _Result([photo] if self.name == "story_photos" and self.op == "select" else [])

    monkeypatch.setattr(admin, "supabase", SimpleNamespace(table=lambda name: Table(name)))
    monkeypatch.setattr(admin, "get_settings", lambda: SimpleNamespace(minio_bucket=BUCKET))
    monkeypatch.setattr(admin.minio_client, "public_url", lambda key: f"https://cdn.test/{BUCKET}/{key}")
    monkeypatch.setattr(admin.minio_client, "delete_object", lambda key: removed.append(key))
    admin.admin_delete_cdn_file(key="e/d/a.jpg", admin="Sam")
    assert removed == ["e/d/a.jpg", "e/d/a.thumb.webp"]


# ── The backfill ─────────────────────────────────────────────────────────────


def test_the_backfill_makes_them_for_a_photo_and_from_the_poster_for_a_video(monkeypatch):
    uploads = {}
    sources = {"e/d/a.jpg": jpeg(2560, 1920), "e/d/b.poster.jpg": jpeg(1280, 720)}
    monkeypatch.setattr(story_previews, "get_settings", lambda: SimpleNamespace(minio_bucket=BUCKET))
    monkeypatch.setattr(story_previews.minio_client, "get_object_bytes", lambda key: (sources[key], "x"))
    monkeypatch.setattr(story_previews.minio_client, "upload_bytes", lambda key, data, ctype: uploads.setdefault(key, data) and f"https://cdn.test/{BUCKET}/{key}")

    photo = story_previews.make_for_row({"image_url": f"https://cdn.test/{BUCKET}/e/d/a.jpg"})
    assert photo["thumb_url"].endswith("e/d/a.thumb.webp") and photo["preview_url"].endswith("e/d/a.preview.webp")

    video = story_previews.make_for_row({"image_url": f"https://cdn.test/{BUCKET}/e/d/b.mp4", "poster_url": f"https://cdn.test/{BUCKET}/e/d/b.poster.jpg"})
    assert video == {"thumb_url": f"https://cdn.test/{BUCKET}/e/d/b.thumb.webp"}

    # A video with no poster has nothing to make a thumbnail from.
    assert story_previews.make_for_row({"image_url": f"https://cdn.test/{BUCKET}/e/d/c.mp4"}) is None
