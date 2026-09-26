from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image

from app.core.uploads import sniff_video
from app.routers import admin


def _mp4(brand: bytes = b"isom") -> bytes:
    return b"\x00\x00\x00\x18ftyp" + brand + b"\x00\x00\x02\x00" + b"\x00" * 64


def _png() -> bytes:
    out = BytesIO()
    Image.new("RGB", (4, 4), "red").save(out, "PNG")
    return out.getvalue()


@pytest.mark.parametrize("content, expected", [
    (_mp4(b"isom"), ("video/mp4", "mp4")),
    (_mp4(b"mp42"), ("video/mp4", "mp4")),
    (_mp4(b"qt  "), ("video/quicktime", "mov")),
    (b"\x1a\x45\xdf\xa3" + b"\x00" * 10 + b"webm" + b"\x00" * 20, ("video/webm", "webm")),
    (_mp4(b"heic"), None),                                   # a photo, not a video
    (b"\x1a\x45\xdf\xa3" + b"\x00" * 10 + b"matroska", None),  # .mkv
    (b"<html><script>alert(1)</script></html>", None),
    (b'<svg xmlns="http://www.w3.org/2000/svg"></svg>', None),
    (b"%PDF-1.7 ....", None),
    (b"", None),
])
def test_sniff_video(content, expected):
    assert sniff_video(content) == expected


@pytest.fixture
def stored(monkeypatch):
    calls = []
    monkeypatch.setattr(admin.minio_client, "upload_bytes", lambda key, content, ct: calls.append((key, ct)) or f"https://cdn/{key}")
    return calls


def test_video_is_stored_untouched_under_uploads(stored):
    out = admin._store_quick_upload(_mp4())
    assert out["media"] == "video" and out["key"].startswith("uploads/") and out["key"].endswith(".mp4")
    assert stored[0][1] == "video/mp4"


def test_image_is_stored_under_uploads(stored):
    out = admin._store_quick_upload(_png())
    assert out["media"] == "image" and out["key"].endswith(".png")


@pytest.mark.parametrize("content", [
    b"<html><script>alert(1)</script></html>",
    b'<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>',
    b"%PDF-1.7 hello",
    b"MZ\x90\x00 an exe",
])
def test_anything_else_is_refused(stored, content):
    with pytest.raises(HTTPException) as e:
        admin._store_quick_upload(content)
    assert e.value.status_code == 415
    assert not stored


def test_a_huge_image_is_refused(stored):
    with pytest.raises(HTTPException) as e:
        admin._store_quick_upload(_png() + b"\x00" * (admin._IMAGE_MAX_BYTES + 1))
    assert e.value.status_code == 413
