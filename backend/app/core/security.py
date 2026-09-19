"""Security headers and rate limiting for every response."""
from __future__ import annotations

import ipaddress
import time
from collections import deque
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from app.config import Settings
from app.constants import API_PREFIX

# ── Headers ──────────────────────────────────────────────────────────────────

_COMMON_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), payment=(), geolocation=(self)",
    # Browsers ignore this over plain http, so it's harmless in local dev.
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}

# JSON has nothing to load or run.
_API_CSP = "default-src 'none'; frame-ancestors 'none'"


def _app_csp(settings: Settings) -> str:
    """What the app itself may load. Keep in step with the frontend:
    - images come from anywhere over https (Discord and Google avatars,
      Supabase Storage, the MinIO photo CDN, links people paste);
    - the browser calls Supabase (login), Open-Meteo (weather) and
      Nominatim (place search) directly;
    - meal and ride pages embed Google Maps.
    Inline <style> attributes are needed by the animation library; scripts
    only come from this site (plus the font loader's one inline handler).
    """
    supabase = ""
    if settings.supabase_url:
        host = urlparse(settings.supabase_url).netloc
        supabase = f" https://{host} wss://{host}"
    return "; ".join([
        "default-src 'self'",
        # Plus exactly one inline handler: index.html's non-blocking font
        # loader, onload="this.media='all'". Change that text and this hash
        # has to change with it, or the fonts stop loading.
        "script-src 'self' 'unsafe-hashes' 'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc='",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: https:",
        f"connect-src 'self'{supabase} https://*.open-meteo.com https://nominatim.openstreetmap.org",
        "frame-src https://maps.google.com https://www.google.com",
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ])


def add_security_headers(settings: Settings):
    app_csp = _app_csp(settings)

    async def middleware(request: Request, call_next) -> Response:
        response = await call_next(request)
        for name, value in _COMMON_HEADERS.items():
            response.headers.setdefault(name, value)
        is_api = request.url.path.startswith(API_PREFIX)
        response.headers.setdefault("Content-Security-Policy", _API_CSP if is_api else app_csp)
        return response

    return middleware


# ── Rate limiting ────────────────────────────────────────────────────────────
#
# In memory, per process: enough to blunt a script hammering the API (or
# cycling bogus tokens, each of which costs an auth lookup), without new
# infrastructure. Limits are generous — a page load is a dozen requests.

_WINDOW_SECONDS = 60
_hits: dict[str, deque[float]] = {}
_last_sweep = 0.0


def _from_proxy(host: str) -> bool:
    """The reverse proxy (SWAG) reaches the backend over the LAN or loopback."""
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return host == "testclient"
    return ip.is_private or ip.is_loopback


def _client_key(request: Request) -> str:
    # Behind Cloudflare + the SWAG proxy the socket address is the proxy's and
    # the real client is in these headers. They're only trusted when the
    # request really comes from the proxy: anyone reaching the backend
    # directly could otherwise send a new made-up IP with every request and
    # never hit the limit.
    peer = request.client.host if request.client else "unknown"
    if not _from_proxy(peer):
        return peer
    for header in ("cf-connecting-ip", "x-real-ip"):
        if value := request.headers.get(header):
            return value.strip()
    if forwarded := request.headers.get("x-forwarded-for"):
        return forwarded.split(",")[0].strip()
    return peer


def _sweep(now: float) -> None:
    global _last_sweep
    if now - _last_sweep < _WINDOW_SECONDS:
        return
    _last_sweep = now
    for key in [k for k, q in _hits.items() if not q or now - q[-1] > _WINDOW_SECONDS]:
        _hits.pop(key, None)


def rate_limit(settings: Settings):
    per_minute = settings.rate_limit_per_minute
    writes_per_minute = max(per_minute // 4, 1)

    async def middleware(request: Request, call_next) -> Response:
        # The API, plus the public link previews (they read the database).
        path = request.url.path
        if per_minute <= 0 or not (path.startswith(API_PREFIX) or path.startswith("/events/")):
            return await call_next(request)

        now = time.monotonic()
        _sweep(now)
        is_write = request.method not in ("GET", "HEAD", "OPTIONS")
        key = f"{'w' if is_write else 'r'}:{_client_key(request)}"
        limit = writes_per_minute if is_write else per_minute

        hits = _hits.setdefault(key, deque())
        while hits and now - hits[0] > _WINDOW_SECONDS:
            hits.popleft()
        if len(hits) >= limit:
            retry_after = max(int(_WINDOW_SECONDS - (now - hits[0])) + 1, 1)
            return JSONResponse(
                status_code=429,
                content={"detail": "Te veel verzoeken. Wacht even en probeer het opnieuw."},
                headers={"Retry-After": str(retry_after)},
            )
        hits.append(now)
        return await call_next(request)

    return middleware


# ── Request size ─────────────────────────────────────────────────────────────
# Upload endpoints cap what they read, but the multipart parser has already
# received the whole body by then (to a temp file). Refusing an oversized
# Content-Length up front means a huge request is turned away before any of
# it is stored. Largest real upload: a 15 MB photo, plus form overhead.

MAX_BODY_BYTES = 20 * 1024 * 1024


def limit_body_size():
    async def middleware(request: Request, call_next) -> Response:
        length = request.headers.get("content-length")
        is_upload = request.headers.get("content-type", "").startswith("multipart/")
        if length is None and is_upload:
            # Browsers always state the size of a form upload; one without it
            # (chunked) could otherwise stream past this check.
            return JSONResponse(status_code=411, content={"detail": "Upload zonder bestandsgrootte geweigerd."})
        if length is not None:
            try:
                too_big = int(length) > MAX_BODY_BYTES
            except ValueError:
                too_big = True
            if too_big:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Bestand te groot. Maximum is {MAX_BODY_BYTES // (1024 * 1024)} MB."},
                )
        return await call_next(request)

    return middleware
