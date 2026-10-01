"""
Two ways to get coordinates for a venue pin on the crew map (event, hotel,
meal): `geocode()` turns free text into coordinates via Nominatim
(OpenStreetMap's free, keyless geocoder — the same one the frontend already
uses for its own location search, components/common/LocationSearchInput.tsx),
and `resolve_maps_url()` extracts coordinates directly from a Google Maps
link a member supplied. `geocode()` also backs weather_service.py's forecast
lookups.

Open-Meteo's own geocoding API was tried here first, but it only knows
cities and towns (it's backed by GeoNames), not venues — "Jaarbeurs Utrecht"
or "Ziggodome" returned nothing, only a plain "Utrecht" or "Amsterdam" would.
Nominatim indexes OpenStreetMap's full point-of-interest data, so it actually
resolves the convention-venue and restaurant names this app deals with — but
even that can't always be trusted (a hotel chain's name can resolve to the
wrong city entirely), which is what the maps_url fields and resolve_maps_url
are for: a direct, member-picked point of truth when the name alone isn't
enough.

Best-effort throughout: a location that can't be geocoded, or a network
hiccup, means no pin — never a failed save. Nominatim's usage policy (one
request at a time, no bulk use, an identifying User-Agent) is easily met
here since this only ever fires once per event/meal save, a human-paced
action, never a batch job.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, unquote, urlparse

import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)

_GEO_URL = "https://nominatim.openstreetmap.org/search"
_TIMEOUT = 8.0
_USER_AGENT = "AnkerdCon/1.0 (contact: admin@ankerd.org)"
_COORD_RE = re.compile(r"@(-?\d+\.\d+),(-?\d+\.\d+)")


async def geocode(location: str) -> tuple[float, float] | None:
    """(lat, lng) for `location`, or None if it can't be resolved."""
    location = (location or "").strip()
    if not location:
        return None
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                _GEO_URL,
                params={"format": "json", "limit": 1, "q": location},
                headers={"User-Agent": _USER_AGENT, "Accept-Language": "nl,en"},
            )
            resp.raise_for_status()
            results = resp.json() or []
    except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as e:
        logger.warning("Geocoding %r failed: %s", location, e)
        return None
    if not results:
        return None
    try:
        return float(results[0]["lat"]), float(results[0]["lon"])
    except (KeyError, TypeError, ValueError):
        return None


async def resolve_maps_url(url: str) -> tuple[float, float] | None:
    """(lat, lng) embedded in a Google Maps link, or None if it isn't one (or
    doesn't carry one). A short link (maps.app.goo.gl/...) needs following —
    Google Maps embeds the pin's coordinates in the resolved URL as
    `@lat,lng,zoom`, behind a one-time `consent.google.com` interstitial for
    a client with no prior cookies (an unquoted `continue=` query param
    carries the real URL then). This is a better source of truth than
    text-geocoding the location when both are available — it's the exact
    point the member picked, not a best guess from a name or address.
    """
    url = (url or "").strip()
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": _USER_AGENT})
            final_url = str(resp.url)
    except httpx.RequestError as e:
        logger.warning("Resolving maps URL %r failed: %s", url, e)
        return None
    if "consent.google.com" in final_url:
        continue_param = parse_qs(urlparse(final_url).query).get("continue", [None])[0]
        if continue_param:
            final_url = unquote(continue_param)
    match = _COORD_RE.search(final_url)
    if not match:
        return None
    try:
        return float(match.group(1)), float(match.group(2))
    except ValueError:
        return None


async def resolve_location(text: str | None, maps_url: str | None) -> tuple[float, float] | None:
    """The coordinates to store for a venue: a given Maps link's own point
    when it resolves to one (the exact spot a member picked beats a guess
    from a name), otherwise the free-text location geocoded the usual way.
    """
    if maps_url:
        coords = await resolve_maps_url(maps_url)
        if coords:
            return coords
    return await geocode(text) if text else None
