"""
Fetch weather data from Open-Meteo (free, no API key required).

Only used for Discord notification embeds — errors are silently swallowed so
that a failed weather lookup never blocks the notification or the API request.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import httpx

_GEO_URL     = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_TIMEOUT      = 8.0


@dataclass
class EventWeather:
    icon: str
    description: str
    temp_max: int
    temp_min: int
    precip_prob: int        # %
    precip_mm: float        # mm
    wind_kmh: int


def _wmo_info(code: int) -> tuple[str, str]:
    """Return (icon, Dutch description) for a WMO weather interpretation code."""
    if code == 0:   return "☀️",  "Heldere hemel"
    if code == 1:   return "🌤️", "Overwegend helder"
    if code == 2:   return "⛅",  "Gedeeltelijk bewolkt"
    if code == 3:   return "☁️",  "Bewolkt"
    if code <= 48:  return "🌫️", "Mist"
    if code <= 55:  return "🌦️", "Motregen"
    if code <= 65:  return "🌧️", "Regen"
    if code <= 67:  return "🌧️", "IJzelregen"
    if code <= 75:  return "❄️",  "Sneeuwval"
    if code <= 82:  return "🌦️", "Regenbuien"
    if code <= 86:  return "🌨️", "Sneeuwbuien"
    if code <= 99:  return "⛈️",  "Onweer"
    return "🌡️", "Onbekend"


def _parse_date(date_str: str) -> str | None:
    """Normalize DD-MM-YYYY or YYYY-MM-DD to YYYY-MM-DD. Returns None on failure."""
    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


async def fetch_event_weather(location: str, date_str: str) -> EventWeather | None:
    """Return weather for *location* on *date_str*, or None if unavailable."""
    date = _parse_date(date_str)
    if not date:
        return None

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        try:
            # 1. Geocode the location name
            geo = await client.get(_GEO_URL, params={
                "name": location, "count": 1, "language": "nl", "format": "json",
            })
            geo.raise_for_status()
            results = geo.json().get("results") or []
            if not results:
                return None
            lat, lon = results[0]["latitude"], results[0]["longitude"]

            # 2. Daily forecast for the event date
            forecast = await client.get(_FORECAST_URL, params={
                "latitude": lat,
                "longitude": lon,
                "daily": ",".join([
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_sum",
                    "precipitation_probability_max",
                    "wind_speed_10m_max",
                ]),
                "timezone": "Europe/Amsterdam",
                "start_date": date,
                "end_date": date,
            })
            forecast.raise_for_status()
            daily = forecast.json().get("daily") or {}

            if not daily.get("time"):
                return None  # Date out of forecast range (>16 days)

            code = int(daily["weather_code"][0])
            icon, description = _wmo_info(code)

            return EventWeather(
                icon=icon,
                description=description,
                temp_max=round(daily["temperature_2m_max"][0]),
                temp_min=round(daily["temperature_2m_min"][0]),
                precip_prob=int(daily["precipitation_probability_max"][0] or 0),
                precip_mm=round((daily["precipitation_sum"][0] or 0) * 10) / 10,
                wind_kmh=round(daily["wind_speed_10m_max"][0] or 0),
            )

        except (httpx.RequestError, httpx.HTTPStatusError, KeyError, IndexError, TypeError):
            return None
