"""Discord/Slack/etc. link-embed support for shared event URLs.

The frontend is a client-rendered SPA, so a bare index.html gives every
shared link the same generic preview — link-unfurling crawlers never run
the app's JavaScript to see the real event. This module detects requests
from those crawlers (by User-Agent) and serves a tiny static HTML document
with Open Graph tags built from the event's data instead of the SPA shell.
Everyone else still gets the normal app.

Two link shapes carry an event: `/trips/{id}`, which the event page's share
button produces, and the older `/events/{day id}`, still in chats from before
navigation moved to trips.

Only what a preview needs is shown. Anyone can send a crawler User-Agent, so
these pages are effectively public for anyone holding the link: where the
group will be and the event's description stay behind the login.
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


def _format_date_range(first: str | None, last: str | None) -> str | None:
    """"21 november 2026", or "21 – 23 november 2026" for a multi-day trip."""
    if not first or not last or first == last:
        return _format_date(first)
    try:
        fy, fm, fd = (int(x) for x in first.split("-")[:3])
        ly, lm, ld = (int(x) for x in last.split("-")[:3])
    except Exception:
        return _format_date(first)
    if (fy, fm) == (ly, lm):
        return f"{fd} – {ld} {_MONTHS_NL[lm - 1]} {ly}"
    if fy == ly:
        return f"{fd} {_MONTHS_NL[fm - 1]} – {ld} {_MONTHS_NL[lm - 1]} {ly}"
    return f"{_format_date(first)} – {_format_date(last)}"


def _serve_spa() -> HTMLResponse:
    try:
        return HTMLResponse((_DIST / "index.html").read_text(encoding="utf-8"))
    except OSError:
        # A deploy briefly empties/rewrites dist/ (the build's emptyOutDir
        # truncates it before the new files land). A real user hitting this
        # exact window — e.g. an installed PWA force-reloading after sitting
        # backgrounded — would otherwise get the app's raw JSON 500 handler
        # instead of a page. A short auto-retry recovers once the build
        # finishes, without ever showing that raw error.
        logger.warning("Link preview: dist/index.html unreadable, likely mid-deploy")
        return HTMLResponse(
            '<!doctype html><html><head><meta charset="UTF-8">'
            '<meta http-equiv="refresh" content="2" /></head><body></body></html>',
            status_code=503,
        )


def _preview_page(path: str, event: dict, date_text: str | None) -> HTMLResponse:
    base = (get_settings().app_url or "").rstrip("/")
    page_url = f"{base}{path}" if base else path
    title = event.get("event_name") or "Ankerd Con"
    description = " · ".join(p for p in (date_text, "Ankerd Con") if p)
    image = event.get("image_url") or (f"{base}/assets/images/ankerd-banner.jpg" if base else None)

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


def _event_fields(event_id: str) -> dict | None:
    resp = supabase.table(Tables.EVENTS).select("event_name, image_url").eq("id", event_id).execute()
    return resp.data[0] if resp.data else None


@router.get("/trips/{trip_id}")
def trip_link_preview(trip_id: str, request: Request) -> HTMLResponse:
    """A trip id is the parent event's id for a multi-day event, or the one
    day's id for a single-day event (see `multi_day_id` in routers/calendar.py)."""
    if not _is_bot(request.headers.get("user-agent", "")):
        return _serve_spa()

    try:
        event = _event_fields(trip_id)
        if event is not None:
            days = supabase.table(Tables.EVENT_DAYS).select("date").eq("event_id", trip_id).execute().data or []
            dates = sorted(d["date"] for d in days if d.get("date"))
        else:
            day_resp = supabase.table(Tables.EVENT_DAYS).select("date, event_id").eq("id", trip_id).execute()
            if not day_resp.data:
                return _serve_spa()
            day = day_resp.data[0]
            event = _event_fields(day["event_id"])
            dates = [day["date"]] if day.get("date") else []
    except Exception as e:
        logger.warning("Link preview: failed to fetch trip %s: %s", trip_id, e)
        return _serve_spa()

    if event is None:
        return _serve_spa()
    date_text = _format_date_range(dates[0], dates[-1]) if dates else None
    return _preview_page(f"/trips/{trip_id}", event, date_text)


@router.get("/events/{event_id}")
def event_link_preview(event_id: str, request: Request) -> HTMLResponse:
    if not _is_bot(request.headers.get("user-agent", "")):
        return _serve_spa()

    try:
        day_resp = supabase.table(Tables.EVENT_DAYS).select("date, event_id").eq("id", event_id).execute()
        if not day_resp.data:
            return _serve_spa()
        day = day_resp.data[0]
        event = _event_fields(day["event_id"])
    except Exception as e:
        logger.warning("Link preview: failed to fetch event %s: %s", event_id, e)
        return _serve_spa()

    if event is None:
        return _serve_spa()
    return _preview_page(f"/events/{event_id}", event, _format_date(day["date"]))
