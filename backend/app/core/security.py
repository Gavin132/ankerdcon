"""Security headers and rate limiting for every response."""
from __future__ import annotations

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


def _client_key(request: Request) -> str:
    # Behind Cloudflare + the SWAG proxy the socket address is the proxy's;
    # the real client is in these headers. Someone reaching the backend
    # directly could spoof them, which only gets them a different bucket.
    for header in ("cf-connecting-ip", "x-real-ip"):
        if value := request.headers.get(header):
            return value.strip()
    if forwarded := request.headers.get("x-forwarded-for"):
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


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
        if per_minute <= 0 or not request.url.path.startswith(API_PREFIX):
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
