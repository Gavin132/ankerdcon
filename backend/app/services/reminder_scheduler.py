"""
Scheduled Discord notifications — event reminders and ticket-sale timing.

`check_and_send_reminders` runs daily at 08:00 and sends notifications for
upcoming calendar events at 7-day, 1-day, and same-day intervals.

`check_and_send_ticket_reminders` runs on a tighter interval (every 15 min)
since ticket_sale_start carries an exact time, not just a date — it notifies
24 hours before sale opens, and again the moment it opens.

Only per-user opt-in DMs (notification_service, per-category) are sent —
reminders never post to the public Discord channel, which is reserved for
announcements an admin explicitly checks "ook naar Discord sturen" for.
Sent reminders are recorded on the calendar row (`reminders_sent` /
`ticket_reminders_sent`) so duplicates are never posted, even after a restart.
"""

from __future__ import annotations

from datetime import datetime, date, timedelta

from app import messages as M
from app.config import get_settings
from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.services import notification_service
from app.services.notification_service import NotificationCategory

logger = get_logger(__name__)

# Intervals checked each run: label → days before event
_INTERVALS: dict[str, int] = {
    "7d":     7,
    "1d":     1,
    "day_of": 0,
}

_REMINDER_CATEGORY: dict[str, str] = {
    "7d":     NotificationCategory.EVENT_REMINDER_7D,
    "1d":     NotificationCategory.EVENT_REMINDER_1D,
    "day_of": NotificationCategory.EVENT_REMINDER_DAY_OF,
}

_REMINDER_DM_TEMPLATE: dict[str, str] = {
    "7d":     M.DM_EVENT_REMINDER_7D,
    "1d":     M.DM_EVENT_REMINDER_1D,
    "day_of": M.DM_EVENT_REMINDER_DAY_OF,
}


def _parse_date(date_str: str) -> date | None:
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def _location_line(location: str | None) -> str:
    return f"\n📍 {location}" if location else ""


async def check_and_send_reminders() -> None:
    settings = get_settings()
    if not settings.discord_bot_token:
        return

    today = date.today()

    try:
        resp = supabase.table(Tables.CALENDAR).select(
            "id, event_name, date, location, ticket_url, website, "
            "what_to_bring, locker_info, parking_info, reminders_sent"
        ).execute()
    except Exception as e:
        logger.error("Reminders: DB fetch failed: %s", e)
        return

    for event in resp.data:
        event_date = _parse_date(event.get("date") or "")
        if not event_date:
            continue

        already_sent: list[str] = event.get("reminders_sent") or []

        for label, days_before in _INTERVALS.items():
            if label in already_sent:
                continue
            if today != event_date - timedelta(days=days_before):
                continue

            # Due — send notification and mark as sent
            try:
                notification_service.broadcast_category_dm(
                    settings.discord_bot_token,
                    _REMINDER_CATEGORY[label],
                    _REMINDER_DM_TEMPLATE[label].format(
                        event_name=event["event_name"],
                        date=event["date"],
                        location_line=_location_line(event.get("location")),
                    ),
                )
                supabase.table(Tables.CALENDAR).update(
                    {"reminders_sent": already_sent + [label]}
                ).eq("id", event["id"]).execute()
                logger.info("Reminders: sent '%s' reminder for '%s'", label, event["event_name"])
            except Exception as e:
                logger.error(
                    "Reminders: failed to send '%s' for '%s': %s",
                    label,
                    event["event_name"],
                    e,
                )


async def check_and_send_ticket_reminders() -> None:
    """24h-before and at-open ticket sale notifications — checked frequently
    since ticket_sale_start carries an exact time, not just a date."""
    settings = get_settings()
    if not settings.discord_bot_token:
        return

    now = datetime.now()

    try:
        resp = supabase.table(Tables.CALENDAR).select(
            "id, event_name, date, ticket_sale_start, ticket_url, ticket_reminders_sent"
        ).execute()
    except Exception as e:
        logger.error("Ticket reminders: DB fetch failed: %s", e)
        return

    for event in resp.data:
        raw = event.get("ticket_sale_start")
        if not raw:
            continue
        try:
            sale_at = datetime.fromisoformat(raw)
        except ValueError:
            continue

        already_sent: list[str] = event.get("ticket_reminders_sent") or []
        to_send: list[str] = []

        if "24h" not in already_sent and sale_at - timedelta(hours=24) <= now < sale_at:
            to_send.append("24h")
        if "open" not in already_sent and now >= sale_at:
            to_send.append("open")

        if not to_send:
            continue

        for phase in to_send:
            try:
                if phase == "24h":
                    notification_service.broadcast_category_dm(
                        settings.discord_bot_token,
                        NotificationCategory.TICKET_SALE,
                        M.DM_TICKET_SALE_24H.format(
                            event_name=event["event_name"],
                            ticket_sale_start=sale_at.strftime("%d-%m-%Y om %H:%M"),
                        ),
                    )
                else:
                    notification_service.broadcast_category_dm(
                        settings.discord_bot_token,
                        NotificationCategory.TICKET_SALE,
                        M.DM_TICKET_SALE_OPEN.format(event_name=event["event_name"]),
                    )
                logger.info("Ticket reminders: sent '%s' for '%s'", phase, event["event_name"])
            except Exception as e:
                logger.error(
                    "Ticket reminders: failed to send '%s' for '%s': %s", phase, event["event_name"], e
                )

        try:
            supabase.table(Tables.CALENDAR).update(
                {"ticket_reminders_sent": already_sent + to_send}
            ).eq("id", event["id"]).execute()
        except Exception as e:
            logger.error("Ticket reminders: failed to mark sent for '%s': %s", event["event_name"], e)
