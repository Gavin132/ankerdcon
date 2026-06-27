"""
Ankerd Con — Discord webhook notifications.

Each public ``notify_*`` coroutine posts a branded embed to the configured
Discord webhook. All functions are fire-and-forget (errors are silently
swallowed) and are intended to run via FastAPI ``BackgroundTasks``.

Usage::

    background_tasks.add_task(
        discord_service.notify_ride_created,
        settings.discord_webhook_url,
        settings.app_url,
        ride,
    )

Adding a new notification:
  1. Pick a colour from ``_COLORS`` (or add one).
  2. Write an ``async def notify_*`` function using ``_embed()`` + ``_post()``.
  3. Call it in the appropriate router with ``background_tasks.add_task``.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from app import messages as M
from app.services.weather_service import fetch_event_weather

# ── Brand colour palette ───────────────────────────────────────────────────────
# Using the Ankerd sky / indigo / amber scale consistently across embed types.
_COLORS: dict[str, int] = {
    "info": 0x38BDF8,  # sky-400    – generic / fallback
    "event": 0x818CF8,  # indigo-400 – calendar events
    "ticket": 0xFBBF24,  # amber-400  – ticket sale announcements
    "ride": 0x34D399,  # emerald-400 – transport / rides
    "meal": 0xFB923C,  # orange-400  – food / meals
}

_BOT_NAME = "Ankerd Con"
_FOOTER = {"text": "Ankerd Con"}


# ── Low-level helpers ──────────────────────────────────────────────────────────


def _field(name: str, value: str, *, inline: bool = True) -> dict[str, Any]:
    return {"name": name, "value": value, "inline": inline}


def _embed(
    *,
    title: str,
    color: int,
    description: str | None = None,
    fields: list[dict] | None = None,
    url: str | None = None,
) -> dict[str, Any]:
    embed: dict[str, Any] = {
        "title": title,
        "color": color,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "footer": _FOOTER,
    }
    if description:
        embed["description"] = description
    if fields:
        embed["fields"] = fields
    if url:
        embed["url"] = url
    return embed


def _payload(*embeds: dict) -> dict[str, Any]:
    return {"username": _BOT_NAME, "embeds": list(embeds)}


async def _post(webhook_url: str, payload: dict) -> None:
    """POST to the Discord webhook. Never raises — notification failures must
    never break the main API request."""
    if not webhook_url:
        return
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            await client.post(webhook_url, json=payload)
        except httpx.RequestError:
            pass


def _app_link(app_url: str, path: str = "") -> str | None:
    base = (app_url or "").rstrip("/")
    return f"{base}{path}" if base else None


def _links(*pairs: tuple[str, str | None]) -> str:
    """Build a space-separated string of Markdown links, skipping None URLs."""
    return "  ".join(f"[{label}]({url})" for label, url in pairs if url)


# ── Public notification functions ──────────────────────────────────────────────


async def notify_event_created(
    webhook_url: str,
    app_url: str,
    *,
    event_name: str,
    date: str,
    description: str | None = None,
    location: str | None = None,
    website: str | None = None,
    ticket_url: str | None = None,
    ticket_sale_start: str | None = None,
    ticket_types: list[dict] | None = None,
    locker_info: str | None = None,
    parking_info: str | None = None,
    what_to_bring: str | None = None,
    special_instructions: str | None = None,
) -> None:
    """Posted when an admin creates a new calendar event."""
    fields: list[dict] = []

    # ── Row 1: date + location side by side ───────────────────────────────────
    fields.append(_field(M.FIELD_DATE, f"**{date}**"))
    if location:
        fields.append(_field(M.FIELD_LOCATION, f"**{location}**"))

    # ── Weather — full-width below date/location ───────────────────────────────
    if location:
        weather = await fetch_event_weather(location, date)
        if weather:
            weather_value = (
                f"{weather.icon} **{weather.description}**\n"
                f"🌡️ {weather.temp_max}°C / {weather.temp_min}°C"
                f"  ·  🌧️ {weather.precip_prob}%"
                f"  ·  💨 {weather.wind_kmh} km/h"
            )
            fields.append(_field(M.FIELD_WEATHER, weather_value, inline=False))

    # ── Ticket sale start — prominent, full-width ──────────────────────────────
    if ticket_sale_start:
        sale_value = f"**{ticket_sale_start}**"
        if ticket_url:
            sale_value += f"\n[{M.LINK_TICKETS}]({ticket_url})"
        fields.append(_field(M.FIELD_TICKET_SALE, sale_value, inline=False))

    # ── Ticket types — bullet list ─────────────────────────────────────────────
    if ticket_types:
        ticket_lines = "\n".join(
            f"• **{t['title']}** — €{float(t['price']):.2f}" for t in ticket_types
        )
        fields.append(_field(M.FIELD_TICKETS, ticket_lines, inline=False))

    # ── Practical info ────────────────────────────────────────────────────────
    if locker_info:
        fields.append(_field(M.FIELD_LOCKERS, locker_info, inline=False))
    if parking_info:
        fields.append(_field(M.FIELD_PARKING, parking_info, inline=False))
    if what_to_bring:
        bring_lines = (
            "\n".join(f"• {item.strip()}" for item in what_to_bring.split(","))
            if "," in what_to_bring
            else what_to_bring
        )
        fields.append(_field(M.FIELD_WHAT_TO_BRING, bring_lines, inline=False))
    if special_instructions:
        fields.append(_field("⚠️ Let op", special_instructions, inline=False))

    # ── Description block ─────────────────────────────────────────────────────
    link_parts: list[str] = []
    if website:
        link_parts.append(f"[{M.LINK_WEBSITE}]({website})")
    if ticket_url and not ticket_sale_start:
        link_parts.append(f"[{M.LINK_TICKETS}]({ticket_url})")
    app_link = _app_link(app_url, "/more")
    if app_link:
        link_parts.append(f"[{M.LINK_APP_CALENDAR}]({app_link})")

    desc_parts: list[str] = []
    if description:
        desc_parts.append(description)
    if link_parts:
        desc_parts.append("  ·  ".join(link_parts))

    await _post(
        webhook_url,
        _payload(
            _embed(
                title=M.EMBED_EVENT_TITLE.format(event_name=event_name),
                color=_COLORS["event"],
                description="\n\n".join(desc_parts) or None,
                fields=fields or None,
            )
        ),
    )


async def notify_ticket_sale_opening(
    webhook_url: str,
    app_url: str,
    *,
    event_name: str,
    date: str,
    ticket_sale_start: str,
    ticket_url: str | None = None,
    ticket_types: list[dict] | None = None,
) -> None:
    """Posted when an event is saved with a ticket-sale-start date, alerting
    crew members when they can buy tickets."""
    fields: list[dict] = [
        _field("Evenement", event_name),
        _field("Evenementdatum", date),
        _field("Verkoop start op", ticket_sale_start, inline=False),
    ]
    if ticket_types:
        lines = "\n".join(
            f"**{t['title']}** — €{float(t['price']):.2f}" for t in ticket_types
        )
        fields.append(_field("Ticketprijzen", lines, inline=False))

    action_links = _links(
        ("🎟️ Koop tickets", ticket_url),
        ("📱 Bekijk in de app", _app_link(app_url, "/calendar")),
    )

    await _post(
        webhook_url,
        _payload(
            _embed(
                title="🎟️  Kaartverkoop",
                color=_COLORS["ticket"],
                description=action_links or None,
                fields=fields,
                url=ticket_url,
            )
        ),
    )


async def notify_ride_created(
    webhook_url: str,
    app_url: str,
    *,
    direction: str,
    driver: str,
    vehicle_type: str,
    departure_time: str,
    start_location: str,
    total_seats: int,
    is_public_transport: bool = False,
    parking_info: str | None = None,
    maps_link: str | None = None,
    action_required: bool = False,
) -> None:
    """Posted when a new ride is created (by a user or an admin)."""
    direction_label = {
        "Inbound": "Heen — naar bestemming",
        "Outbound": "Terug — naar huis",
        "Restaurant": "Restaurant",
    }.get(direction, direction)

    # ── Row 1: driver + departure time side by side ────────────────────────────
    fields: list[dict] = [
        _field(M.FIELD_DRIVER, f"**{driver}**"),
        _field(M.FIELD_DEPARTURE, f"**{departure_time}**"),
    ]

    # ── Row 2: start location + seats/type ────────────────────────────────────
    fields.append(_field(M.FIELD_START_LOCATION, f"**{start_location}**"))
    if is_public_transport:
        fields.append(_field(M.FIELD_VEHICLE_TYPE, "Openbaar vervoer"))
    else:
        fields.append(_field(M.FIELD_SEATS, f"**{total_seats}** beschikbaar"))

    if parking_info:
        fields.append(_field(M.FIELD_PARKING, parking_info, inline=False))

    # ── Description ───────────────────────────────────────────────────────────
    desc_parts: list[str] = []
    if action_required:
        desc_parts.append(
            "⚠️ **Actie vereist** — neem contact op met de chauffeur voor meer informatie."
        )
    link_parts: list[str] = []
    if maps_link:
        link_parts.append(f"[{M.LINK_MAPS}]({maps_link})")
    app_link = _app_link(app_url, "/transport")
    if app_link:
        link_parts.append(f"[{M.LINK_APP_TRANSPORT}]({app_link})")
    if link_parts:
        desc_parts.append("  ·  ".join(link_parts))

    await _post(
        webhook_url,
        _payload(
            _embed(
                title=M.EMBED_RIDE_TITLE.format(direction=direction_label),
                color=_COLORS["ride"],
                description="\n\n".join(desc_parts) or None,
                fields=fields,
            )
        ),
    )


async def notify_event_reminder(
    webhook_url: str,
    app_url: str,
    *,
    event_name: str,
    date: str,
    interval: str,  # "7d" | "1d" | "day_of"
    location: str | None = None,
    ticket_url: str | None = None,
    website: str | None = None,
    what_to_bring: str | None = None,
    locker_info: str | None = None,
    parking_info: str | None = None,
) -> None:
    """Scheduled reminder embed — urgency increases as the event approaches."""
    icon, urgency, color = M.REMINDER_LEVELS.get(
        interval, ("📅", "Herinnering", _COLORS["event"])
    )

    fields: list[dict] = [_field(M.FIELD_DATE, f"**{date}**")]
    if location:
        fields.append(_field(M.FIELD_LOCATION, f"**{location}**"))

    if what_to_bring:
        bring_lines = (
            "\n".join(f"• {item.strip()}" for item in what_to_bring.split(","))
            if "," in what_to_bring
            else what_to_bring
        )
        fields.append(_field(M.FIELD_WHAT_TO_BRING, bring_lines, inline=False))

    if locker_info:
        fields.append(_field(M.FIELD_LOCKERS, locker_info, inline=False))
    if parking_info:
        fields.append(_field(M.FIELD_PARKING, parking_info, inline=False))

    link_parts: list[str] = []
    if ticket_url:
        link_parts.append(f"[{M.LINK_TICKETS}]({ticket_url})")
    if website:
        link_parts.append(f"[{M.LINK_WEBSITE}]({website})")
    app_link = _app_link(app_url, "/more")
    if app_link:
        link_parts.append(f"[{M.LINK_APP_CALENDAR}]({app_link})")

    await _post(
        webhook_url,
        _payload(
            _embed(
                title=M.EMBED_REMINDER_TITLE.format(
                    icon=icon, event_name=event_name, urgency=urgency
                ),
                color=color,
                description="  ·  ".join(link_parts) or None,
                fields=fields,
            )
        ),
    )


async def notify_meal_created(
    webhook_url: str,
    app_url: str,
    *,
    meal_name: str,
    time: str,
    location: str | None = None,
    cost: float | None = None,
    transport_needed: bool = False,
) -> None:
    """Posted when a new meal is added."""
    # ── Inline fields: tijd + locatie + kosten side by side ───────────────────
    fields: list[dict] = [_field(M.FIELD_MEAL_TIME, f"**{time}**")]

    if location:
        fields.append(_field(M.FIELD_LOCATION, f"**{location}**"))
    if cost:
        fields.append(_field(M.FIELD_MEAL_COST, f"**€{cost:.2f}**"))
    if transport_needed:
        fields.append(
            _field(M.FIELD_MEAL_TRANSPORT, "Vervoer nodig naar locatie", inline=False)
        )

    app_link = _app_link(app_url, "/food")
    desc = f"[{M.LINK_APP_FOOD}]({app_link})" if app_link else None

    await _post(
        webhook_url,
        _payload(
            _embed(
                title=M.EMBED_MEAL_TITLE.format(meal_name=meal_name),
                color=_COLORS["meal"],
                description=desc,
                fields=fields,
            )
        ),
    )
