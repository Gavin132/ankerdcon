"""Discord/Slack/etc. link-embed support for shared event URLs.

The frontend is a client-rendered SPA, so a bare index.html gives every
shared link the same generic preview — link-unfurling crawlers never run
the app's JavaScript to see the real event. This module detects requests
from those crawlers (by User-Agent) and, for `/events/{id}` only, serves a
tiny static HTML document with Open Graph tags built from that event's
data instead of the SPA shell. Everyone else still gets the normal app.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.config import get_settings
from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

_DIST = Path(__file__).resolve().parent.parent.parent / "dist"

# Substrings (already lowercase) found in the User-Agent of link-unfurling bots.
_BOT_MARKERS = (
    "discordbot",
    "slackbot",
    "twitterbot",
    "facebookexternalhit",
    "whatsapp",
    "telegrambot",
    "linkedinbot",
    "pinterest",
    "skypeuripreview",
    "vkshare",
    "redditbot",
    "embedly",
    "quora link preview",
)

_MONTHS_NL = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
]


def _is_bot(user_agent: str) -> bool:
    ua = user_agent.lower()
    return any(marker in ua for marker in _BOT_MARKERS)


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _format_date(date_str: str | None) -> str | None:
    if not date_str:
        return None
    try:
        y, m, d = date_str.split("-")[:3]
        return f"{int(d)} {_MONTHS_NL[int(m) - 1]} {y}"
    except Exception:
        return None


def _serve_spa() -> HTMLResponse:
    return HTMLResponse((_DIST / "index.html").read_text(encoding="utf-8"))


@router.get("/events/{event_id}")
def event_link_preview(event_id: str, request: Request) -> HTMLResponse:
    if not _is_bot(request.headers.get("user-agent", "")):
        return _serve_spa()

    settings = get_settings()
    base = (settings.app_url or "").rstrip("/")
    page_url = f"{base}/events/{event_id}" if base else f"/events/{event_id}"

    try:
        resp = (
            supabase.table(Tables.CALENDAR)
            .select("event_name, description, date, location, image_url")
            .eq("id", event_id)
            .execute()
        )
    except Exception as e:
        logger.warning("Link preview: failed to fetch event %s: %s", event_id, e)
        return _serve_spa()

    if not resp.data:
        return _serve_spa()

    event = resp.data[0]
    title = event.get("event_name") or "Ankerd Con"

    date_part = _format_date(event.get("date"))
    summary = " · ".join(p for p in (date_part, event.get("location")) if p)
    description = summary or event.get("description") or "Live Event Logistics"

    image = event.get("image_url") or (f"{base}/assets/images/ankerd-banner.png" if base else None)

    meta_tags = [
        '<meta property="og:type" content="website" />',
        f'<meta property="og:title" content="{_escape(title)}" />',
        f'<meta property="og:description" content="{_escape(description)}" />',
        f'<meta property="og:url" content="{_escape(page_url)}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
    ]
    if image:
        meta_tags.append(f'<meta property="og:image" content="{_escape(image)}" />')

    html = f"""<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <title>{_escape(title)}</title>
    {"".join(meta_tags)}
    <meta http-equiv="refresh" content="0; url={_escape(page_url)}" />
  </head>
  <body></body>
</html>"""
    return HTMLResponse(html)
