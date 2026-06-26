"""
Event reminder scheduler — runs daily at 08:00 and sends Discord notifications
for upcoming calendar events at 7-day, 1-day, and same-day intervals.

Sent reminders are recorded in the `reminders_sent` column of each calendar row
so duplicate notifications are never posted, even after a server restart.
"""

from __future__ import annotations

from datetime import datetime, date, timedelta

from app.config import get_settings
from app.constants import Tables
from app.core.database import supabase
from app.services import discord_service

# Intervals checked each run: label → days before event
_INTERVALS: dict[str, int] = {
    "7d":     7,
    "1d":     1,
    "day_of": 0,
}


def _parse_date(date_str: str) -> date | None:
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


async def check_and_send_reminders() -> None:
    settings = get_settings()
    if not settings.discord_webhook_url:
        return

    today = date.today()

    try:
        resp = supabase.table(Tables.CALENDAR).select(
            "id, event_name, date, location, ticket_url, website, "
            "what_to_bring, locker_info, parking_info, reminders_sent"
        ).execute()
    except Exception as e:
        print(f"[reminders] DB fetch failed: {e}")
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
                await discord_service.notify_event_reminder(
                    settings.discord_webhook_url,
                    settings.app_url,
                    event_name=event["event_name"],
                    date=event["date"],
                    interval=label,
                    location=event.get("location"),
                    ticket_url=event.get("ticket_url"),
                    website=event.get("website"),
                    what_to_bring=event.get("what_to_bring"),
                    locker_info=event.get("locker_info"),
                    parking_info=event.get("parking_info"),
                )
                supabase.table(Tables.CALENDAR).update(
                    {"reminders_sent": already_sent + [label]}
                ).eq("id", event["id"]).execute()
                print(f"[reminders] Sent '{label}' reminder for '{event['event_name']}'")
            except Exception as e:
                print(f"[reminders] Failed to send '{label}' for '{event['event_name']}': {e}")
