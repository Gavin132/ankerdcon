"""Smaller copies of a story photo, so grids and the story viewer do not pull the full-size file.

A photo as the app stores it is up to 2560 px wide, easily a megabyte. A grid of nine of those is
ten megabytes of mobile data for pictures shown 100 px wide. So each photo gets two lighter WebP
copies next to the original:

  * a *thumbnail* (480 px on the long side) for grids, the story ring and profile photos;
  * a *preview* (1280 px) for the story viewer, which is plenty for a phone screen. Only made when the
    original is clearly bigger than that; a smaller original is its own preview.

The original is never touched: downloads, the zip and "share" all keep using it.
"""
from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageOps

THUMB_MAX = 480
PREVIEW_MAX = 1280
# An original only a little over the preview size is not worth a second copy.
PREVIEW_ONLY_ABOVE = 1500

_THUMB_QUALITY = 74
_PREVIEW_QUALITY = 80

THUMB_SUFFIX = ".thumb.webp"
PREVIEW_SUFFIX = ".preview.webp"
POSTER_SUFFIX = ".poster.jpg"
# Every file made from a story photo, for telling them apart from the photos themselves.
DERIVATIVE_SUFFIXES = (THUMB_SUFFIX, PREVIEW_SUFFIX, POSTER_SUFFIX)


def is_derivative(key: str) -> bool:
    return key.endswith(DERIVATIVE_SUFFIXES)


_DERIVATIVE_COLUMNS = ("poster_url", "thumb_url", "preview_url")


def derivative_urls(row: dict) -> list[str]:
    """The files made from a story photo (its video poster, thumbnail and preview), for cleaning up with it."""
    return [row[c] for c in _DERIVATIVE_COLUMNS if row.get(c)]


def _encode(img: Image.Image, longest: int, quality: int) -> bytes:
    img = img.copy()
    img.thumbnail((longest, longest), Image.LANCZOS)
    out = BytesIO()
    img.save(out, "WEBP", quality=quality, method=4)
    return out.getvalue()


def make_derivatives(content: bytes, *, preview: bool = True) -> tuple[bytes, bytes | None]:
    """(thumbnail, preview or None) for an image already checked by `clean_image`. Raises on bytes
    Pillow cannot read, which cannot happen for a photo the upload route accepted."""
    img = Image.open(BytesIO(content))
    img = ImageOps.exif_transpose(img)
    if img.mode in ("RGBA", "LA", "P"):
        # Transparency has no place in a photo thumbnail: put it on white rather than black.
        rgba = img.convert("RGBA")
        flat = Image.new("RGB", rgba.size, "white")
        flat.paste(rgba, mask=rgba.getchannel("A"))
        img = flat
    elif img.mode != "RGB":
        img = img.convert("RGB")
    thumb = _encode(img, THUMB_MAX, _THUMB_QUALITY)
    big = preview and max(img.size) > PREVIEW_ONLY_ABOVE
    return thumb, _encode(img, PREVIEW_MAX, _PREVIEW_QUALITY) if big else None
