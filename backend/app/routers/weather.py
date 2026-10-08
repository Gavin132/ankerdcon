"""
A caching proxy in front of Open-Meteo for the member-facing weather card
(frontend/src/hooks/useEventWeather.ts). Every member's browser used to call
Open-Meteo directly — harmless for one person, but a burst of members
opening the app around the same time (exactly when it matters most, right
before an event) could hit Open-Meteo with the same geocode/forecast request
many times over. Caching it here server-side means the whole group shares
one fetch instead of one each.

Response shapes are untouched passthroughs of Open-Meteo's own — the
frontend keeps its existing parsing, WMO-code mapping and hourly-slot
selection exactly as it was, only the URL it fetches changed.

In-memory, per-process: good enough here since this cache only exists to
smooth out a burst of near-simultaneous requests, not to persist anything —
and it's already how notification/identity caches elsewhere in this app
work (see app/dependencies.py's _identity_cache).
"""

from __future__ import annotations

import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.routes import WeatherRoutes

logger = get_logger(__name__)
router = APIRouter(prefix=WeatherRoutes.PREFIX, tags=["weather"])

_GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
_TIMEOUT = 10.0
_UPSTREAM_ERROR = "Weerdata niet beschikbaar. Probeer het later opnieuw."

# A burst of near-simultaneous requests is the only thing this is meant to
# smooth out, so a short TTL is enough — it is not trying to replicate the
# frontend's own "4 times a day" refresh cadence, just collapse a stampede.
_GEOCODE_TTL = 24 * 60 * 60     # a day — an address's coordinates don't change
_FORECAST_TTL = 2 * 60 * 60     # 2 hours
_ARCHIVE_TTL = 7 * 24 * 60 * 60  # a week — historical data never changes

_cache: dict[tuple, tuple[float, dict]] = {}


async def _cached_get(url: str, params: dict, cache_key: tuple, ttl: float, *, bad_request_means: dict | None = None) -> dict:
    """`bad_request_means` is what a 400 from Open-Meteo stands for, when it is an
    answer rather than an error (see `forecast`)."""
    now = time.monotonic()
    hit = _cache.get(cache_key)
    if hit and hit[0] > now:
        return hit[1]
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        if bad_request_means is None or e.response.status_code != 400:
            logger.warning("Weather proxy request to %s failed: %s", url, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_UPSTREAM_ERROR)
        data = bad_request_means
    except (httpx.RequestError, ValueError) as e:
        logger.warning("Weather proxy request to %s failed: %s", url, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_UPSTREAM_ERROR)
    _cache[cache_key] = (now + ttl, data)
    return data


@router.get(WeatherRoutes.GEOCODE)
async def geocode(
    name: str = Query(..., min_length=1, max_length=200),
    _: str = Depends(get_current_user),
) -> dict:
    return await _cached_get(
        _GEO_URL,
        {"name": name, "count": 1, "language": "nl", "format": "json"},
        ("geocode", name),
        _GEOCODE_TTL,
    )


@router.get(WeatherRoutes.FORECAST)
async def forecast(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    date: str = Query(..., min_length=10, max_length=10),
    _: str = Depends(get_current_user),
) -> dict:
    return await _cached_get(
        _FORECAST_URL,
        {
            "latitude": latitude,
            "longitude": longitude,
            "daily": ",".join([
                "weather_code", "temperature_2m_max", "temperature_2m_min",
                "apparent_temperature_max", "apparent_temperature_min",
                "precipitation_sum", "precipitation_probability_max",
                "wind_speed_10m_max", "uv_index_max", "sunrise", "sunset",
            ]),
            "hourly": "temperature_2m,precipitation_probability,weather_code",
            "timezone": "Europe/Amsterdam",
            "start_date": date,
            "end_date": date,
        },
        ("forecast", latitude, longitude, date),
        _FORECAST_TTL,
        # Open-Meteo only forecasts about 16 days ahead, and for a date beyond that it
        # answers 400 ("out of allowed range") instead of an empty forecast. That is
        # not a failure: it is how the app learns to show the climate average instead.
        bad_request_means={"daily": {}},
    )


@router.get(WeatherRoutes.ARCHIVE)
async def archive(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    start_date: str = Query(..., min_length=10, max_length=10),
    end_date: str = Query(..., min_length=10, max_length=10),
    _: str = Depends(get_current_user),
) -> dict:
    return await _cached_get(
        _ARCHIVE_URL,
        {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
            "timezone": "Europe/Amsterdam",
        },
        ("archive", latitude, longitude, start_date, end_date),
        _ARCHIVE_TTL,
    )
