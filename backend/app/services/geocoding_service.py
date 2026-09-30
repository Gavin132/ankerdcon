"""
Turns a free-text location into coordinates — Nominatim (OpenStreetMap's free,
keyless geocoder), the same one the frontend already uses for its own location
search (components/common/LocationSearchInput.tsx). Used to place a venue
(event, hotel, meal) on the crew map, and by weather_service.py for its
forecast lookups.

Open-Meteo's own geocoding API was tried here first, but it only knows
cities and towns (it's backed by GeoNames), not venues — "Jaarbeurs Utrecht"
or "Ziggodome" returned nothing, only a plain "Utrecht" or "Amsterdam" would.
Nominatim indexes OpenStreetMap's full point-of-interest data, so it actually
resolves the convention-venue and restaurant names this app deals with.

Best-effort throughout: a location that can't be geocoded, or a network
hiccup, means no pin — never a failed save. Nominatim's usage policy (one
request at a time, no bulk use, an identifying User-Agent) is easily met
here since this only ever fires once per event/meal save, a human-paced
action, never a batch job.
"""

from __future__ import annotations

import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)

_GEO_URL = "https://nominatim.openstreetmap.org/search"
_TIMEOUT = 8.0
_USER_AGENT = "AnkerdCon/1.0 (contact: admin@ankerd.org)"


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
