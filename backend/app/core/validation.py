"""Shared validators for request models."""
from __future__ import annotations

from typing import Annotated, Optional
from urllib.parse import urlparse

from pydantic import AfterValidator

_WEB_SCHEMES = {"http", "https"}


def web_url(value: str | None, *, allow_site_path: bool = False) -> str | None:
    """Only http(s) links may be stored.

    These values end up as `href`/`src` in the app, and a `javascript:` or
    `data:` URL there runs code in whoever clicks it. An empty string is kept
    as-is: update endpoints use it to clear a field. `allow_site_path` also
    accepts a path on this site (`/assets/...`), for images the app ships
    itself.
    """
    if value is None:
        return None
    value = value.strip()
    if not value:
        return value
    if allow_site_path and value.startswith("/") and not value.startswith("//") and "\\" not in value:
        return value
    if ":" not in value.split("/", 1)[0]:
        value = f"https://{value}"  # a bare domain such as "www.pizzeria.nl"
    parsed = urlparse(value)
    if parsed.scheme.lower() not in _WEB_SCHEMES or not parsed.netloc:
        raise ValueError("Alleen http(s)-links zijn toegestaan.")
    return value


def _image_url(value: str | None) -> str | None:
    return web_url(value, allow_site_path=True)


# Field types for request models: a link someone can click, and an image.
WebUrl = Annotated[Optional[str], AfterValidator(web_url)]
ImageUrl = Annotated[Optional[str], AfterValidator(_image_url)]
RequiredImageUrl = Annotated[str, AfterValidator(_image_url)]
