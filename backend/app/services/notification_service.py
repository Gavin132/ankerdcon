"""
Per-user Discord DM notification categories.

This is a layer *in addition to* the shared webhook channel in
discord_service.py — that channel keeps posting everything to everyone,
unconditionally, exactly as it always has (useful for people who don't use
the app but still want to see what's happening). This module is the opt-in
extra: each user can choose, in their profile, which categories they *also*
want as a private DM from the bot.

A user only receives a category DM if all three are true:
  1. `allow_dm` is true (the master "DM's toestaan" switch)
  2. the category is present in `notification_categories`
  3. the profile has a `discord_id` and `is_active` is true

Adding a new category:
  1. Add the key to `NotificationCategory` / `ALL_CATEGORIES` below.
  2. Add a DM_* template to app/messages.py.
  3. Call `broadcast_category_dm` from the relevant router/scheduler alongside
     the existing `discord_service.notify_*` webhook call.
  4. Add the category to NOTIFICATION_CATEGORIES in the frontend
     (frontend/src/constants/notifications.ts) so users can toggle it.
"""

from __future__ import annotations

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.services import discord_bot

logger = get_logger(__name__)


class NotificationCategory:
    EVENT_CREATED = "event_created"
    TICKET_SALE = "ticket_sale"
    EVENT_REMINDER_7D = "event_reminder_7d"
    EVENT_REMINDER_1D = "event_reminder_1d"
    EVENT_REMINDER_DAY_OF = "event_reminder_day_of"
    RIDE_CREATED = "ride_created"
    EXPENSE_CREATED = "expense_created"
    MEAL_CREATED = "meal_created"


ALL_CATEGORIES: list[str] = [
    NotificationCategory.EVENT_CREATED,
    NotificationCategory.TICKET_SALE,
    NotificationCategory.EVENT_REMINDER_7D,
    NotificationCategory.EVENT_REMINDER_1D,
    NotificationCategory.EVENT_REMINDER_DAY_OF,
    NotificationCategory.RIDE_CREATED,
    NotificationCategory.EXPENSE_CREATED,
    NotificationCategory.MEAL_CREATED,
]


def broadcast_category_dm(bot_token: str, category: str, content: str) -> None:
    """Send `content` as a DM to every active, opted-in user for `category`.

    Fire-and-forget — intended for `background_tasks.add_task`. Never raises;
    a failed fetch or a single failed DM must never break the caller.
    """
    if not bot_token:
        return
    try:
        profiles = (
            supabase.table(Tables.PROFILES)
            .select("discord_id, notification_categories, is_active, allow_dm")
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Notification broadcast (%s): failed to fetch profiles: %s", category, e)
        return

    sent = 0
    for profile in profiles:
        if not profile.get("is_active", True):
            continue
        if not profile.get("allow_dm", True):
            continue
        discord_id = profile.get("discord_id")
        if not discord_id:
            continue
        categories = profile.get("notification_categories") or []
        if category not in categories:
            continue
        discord_bot.send_dm(bot_token, discord_id, content)
        sent += 1

    if sent:
        logger.info("Notification broadcast (%s): sent to %d user(s)", category, sent)
