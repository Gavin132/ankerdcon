from __future__ import annotations

import warnings
from io import BytesIO

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps

# Pillow format name -> (content type, file extension)
IMAGE_FORMATS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
    "GIF": ("image/gif", "gif"),
}

# Far above any phone photo, low enough that a tiny file claiming enormous
# dimensions ("decompression bomb") is refused instead of exhausting memory.
_MAX_PIXELS = 60_000_000
Image.MAX_IMAGE_PIXELS = _MAX_PIXELS

_NOT_AN_IMAGE = "Dit bestand is geen geldige afbeelding. Gebruik JPG, PNG of WebP."


async def read_capped(file: UploadFile, max_bytes: int) -> bytes:
    """Read an upload in chunks and abort as soon as it exceeds max_bytes,
    instead of `await file.read()` (which buffers the whole body first and
    only checks the size afterwards — a request sent directly to the API,
    bypassing whatever client-side size limiting the app's own UI does,
    would otherwise be fully received before being rejected)."""
    chunk_size = 1024 * 1024
    total = 0
    chunks: list[bytes] = []
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Bestand te groot. Maximum is {max_bytes // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


def clean_image(content: bytes, allowed: set[str]) -> tuple[bytes, str, str]:
    """Check what an upload really is and strip its metadata.

    The browser's content type is only a claim, so the bytes are decoded to
    find the actual format. Photos straight off a phone carry EXIF data,
    including the GPS position where they were taken, so still images are
    re-encoded without it (after applying the EXIF rotation, so they still
    display upright). Animated GIFs are only checked, not re-encoded, since
    that would drop their frames; GIFs have no EXIF block to strip.

    Returns (bytes, content type, file extension).
    """
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            img = Image.open(BytesIO(content))
            fmt = img.format
            if fmt not in allowed or fmt not in IMAGE_FORMATS:
                raise ValueError(fmt)
            img.load()
    except Exception:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=_NOT_AN_IMAGE)

    content_type, ext = IMAGE_FORMATS[fmt]
    if fmt == "GIF":
        return content, content_type, ext

    img = ImageOps.exif_transpose(img)
    out = BytesIO()
    save_args: dict = {}
    if icc := img.info.get("icc_profile"):
        save_args["icc_profile"] = icc
    if fmt == "JPEG":
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        img.save(out, "JPEG", quality=92, optimize=True, **save_args)
    elif fmt == "WEBP":
        img.save(out, "WEBP", quality=92, **save_args)
    else:
        img.save(out, "PNG", optimize=True, **save_args)
    return out.getvalue(), content_type, ext


# ── Video ────────────────────────────────────────────────────────────────────
# Videos are stored as they come (re-encoding is far too heavy here), so the
# only defence is to check what the bytes really are: an MP4/MOV starts with an
# "ftyp" box naming a video brand, a WebM with the Matroska header. Anything
# else, HTML and SVG included, is refused however the browser labelled it.

# Brands of the "ftyp" box that mean video (not HEIC/AVIF photos, which share the box).
_MP4_BRANDS = {
    b"isom", b"iso2", b"iso4", b"iso5", b"iso6", b"mp41", b"mp42", b"avc1",
    b"dash", b"M4V ", b"M4VH", b"MSNV", b"3gp4", b"3gp5", b"3gp6",
}
_MOV_BRAND = b"qt  "


def sniff_video(content: bytes) -> tuple[str, str] | None:
    """(content type, extension) if these bytes are an MP4, MOV or WebM video."""
    if content[4:8] == b"ftyp":
        brand = content[8:12]
        if brand == _MOV_BRAND:
            return "video/quicktime", "mov"
        if brand in _MP4_BRANDS:
            return "video/mp4", "mp4"
        return None
    if content[:4] == b"\x1a\x45\xdf\xa3" and b"webm" in content[:64]:
        return "video/webm", "webm"
    return None
