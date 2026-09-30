"""
Turns a free-text location into coordinates — Open-Meteo's geocoding API,
free and keyless, the same one weather_service.py already calls for its own
forecast lookups. Used to place a venue (event, hotel, meal) on the crew map.

Best-effort throughout, like weather_service.py: a location that can't be
geocoded, or a network hiccup, means no pin — never a failed save.
"""

from __future__ import annotations

import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)

_GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
_TIMEOUT = 8.0


async def geocode(location: str) -> tuple[float, float] | None:
    """(lat, lng) for `location`, or None if it can't be resolved."""
    location = (location or "").strip()
    if not location:
        return None
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                _GEO_URL, params={"name": location, "count": 1, "language": "nl", "format": "json"}
            )
            resp.raise_for_status()
            results = resp.json().get("results") or []
    except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as e:
        logger.warning("Geocoding %r failed: %s", location, e)
        return None
    if not results:
        return None
    try:
        return float(results[0]["latitude"]), float(results[0]["longitude"])
    except (KeyError, TypeError, ValueError):
        return None
