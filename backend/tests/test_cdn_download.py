"""Admin CDN bulk download: one zip of what the page shows, streamed as it is built."""
import asyncio
import io
import zipfile

import pytest
from fastapi import HTTPException

from app.routers import admin

EVENT = "11111111-1111-1111-1111-111111111111"
DAY = "22222222-2222-2222-2222-222222222222"


def _obj(key: str, size: int = 10) -> dict:
    return {"key": key, "url": f"https://cdn.test/{key}", "size": size, "last_modified": "2026-01-01T00:00:00"}


@pytest.fixture
def bucket(monkeypatch):
    objects = [
        _obj(f"{EVENT}/{DAY}/a.jpg"),
        _obj(f"{EVENT}/{DAY}/b.jpg"),
        _obj("33333333-3333-3333-3333-333333333333/44444444-4444-4444-4444-444444444444/c.jpg"),
        _obj("banners/u1/x.webp"),
    ]
    monkeypatch.setattr(admin.minio_client, "list_all_objects", lambda: ([dict(o) for o in objects], False))
    monkeypatch.setattr(admin.minio_client, "get_object_bytes", lambda key: (key.encode(), "image/jpeg"))
    return objects


def _read_zip(response) -> zipfile.ZipFile:
    async def collect() -> bytes:
        return b"".join([chunk async for chunk in response.body_iterator])

    body = asyncio.run(collect())
    return zipfile.ZipFile(io.BytesIO(body))


def test_download_by_kind_zips_only_that_kind(bucket):
    zf = _read_zip(admin.admin_download_cdn(kind="banner", event=None, admin="Sam"))
    assert zf.namelist() == ["banners/u1/x.webp"]
    assert zf.read("banners/u1/x.webp") == b"banners/u1/x.webp"


def test_download_by_event_zips_that_events_story_photos(bucket):
    zf = _read_zip(admin.admin_download_cdn(kind="story", event=EVENT, admin="Sam"))
    assert sorted(zf.namelist()) == [f"{EVENT}/{DAY}/a.jpg", f"{EVENT}/{DAY}/b.jpg"]


def test_download_names_the_file_after_the_selection(bucket):
    response = admin.admin_download_cdn(kind="story", event=EVENT, admin="Sam")
    assert response.headers["content-disposition"] == 'attachment; filename="cdn-story-11111111.zip"'


def test_download_of_nothing_is_a_404(bucket):
    with pytest.raises(HTTPException) as e:
        admin.admin_download_cdn(kind="badge", event=None, admin="Sam")
    assert e.value.status_code == 404


def test_download_too_big_is_refused_before_it_starts(bucket, monkeypatch):
    monkeypatch.setattr(admin, "_ZIP_MAX_BYTES", 15)
    with pytest.raises(HTTPException) as e:
        admin.admin_download_cdn(kind=None, event=None, admin="Sam")
    assert e.value.status_code == 413


def test_download_rejects_a_malformed_event(bucket):
    with pytest.raises(HTTPException) as e:
        admin.admin_download_cdn(kind="story", event="../etc", admin="Sam")
    assert e.value.status_code == 400


def test_an_unreadable_file_is_skipped_not_fatal(bucket, monkeypatch):
    def flaky(key):
        if key.endswith("a.jpg"):
            raise OSError("gone")
        return key.encode(), "image/jpeg"

    monkeypatch.setattr(admin.minio_client, "get_object_bytes", flaky)
    zf = _read_zip(admin.admin_download_cdn(kind="story", event=EVENT, admin="Sam"))
    assert zf.namelist() == [f"{EVENT}/{DAY}/b.jpg"]
