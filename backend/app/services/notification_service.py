"""
Per-user notification categories, delivered as a Discord DM and/or a web push —
whichever the member has set up.

This is a layer *in addition to* the shared webhook channel in
discord_service.py — that channel keeps posting everything to everyone,
unconditionally, exactly as it always has (useful for people who don't use
the app but still want to see what's happening). This module is the opt-in
extra: each user can choose, in their profile, which categories they *also*
want to hear about privately.

`notification_categories` is deliberately channel-agnostic: it says what a
member wants to hear about, not how. A category DM needs `allow_dm` (the
Discord-specific master switch) too, since that setting only ever meant
"Discord DM's toestaan"; push has no such switch — having a subscription row
at all *is* the opt-in, so every active subscription for an opted-in member
gets pushed regardless of `allow_dm`.

A user receives a category DM when:
  1. `allow_dm` is true (the master "DM's toestaan" switch)
  2. the category is present in `notification_categories`
  3. the profile has a `discord_id` and `is_active` is true
...and a category push when (1) is dropped and (3)'s `discord_id` requirement
becomes "has at least one row in push_subscriptions" instead.

Adding a new category:
  1. Add the key to `NotificationCategory` / `ALL_CATEGORIES` below.
  2. Add a DM_* template to app/messages.py (also used, trimmed, for push — see
     push_service.headline).
  3. Call `broadcast_category_dm` from the relevant router/scheduler alongside
     the existing `discord_service.notify_*` webhook call.
  4. Add the category to NOTIFICATION_CATEGORIES in the frontend
     (frontend/src/constants/notifications.ts) so users can toggle it.
"""

from __future__ import annotations

from app.config import get_settings
from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app.services import discord_bot, push_service

logger = get_logger(__name__)

_APP_TITLE = "Ankerd Con"


class NotificationCategory:
    EVENT_CREATED = "event_created"
    TICKET_SALE = "ticket_sale"
    EVENT_REMINDER_7D = "event_reminder_7d"
    EVENT_REMINDER_1D = "event_reminder_1d"
    EVENT_REMINDER_DAY_OF = "event_reminder_day_of"
    RIDE_CREATED = "ride_created"
    EXPENSE_CREATED = "expense_created"
    MEAL_CREATED = "meal_created"
    FEEDBACK_SUBMITTED = "feedback_submitted"


ALL_CATEGORIES: list[str] = [
    NotificationCategory.EVENT_CREATED,
    NotificationCategory.TICKET_SALE,
    NotificationCategory.EVENT_REMINDER_7D,
    NotificationCategory.EVENT_REMINDER_1D,
    NotificationCategory.EVENT_REMINDER_DAY_OF,
    NotificationCategory.RIDE_CREATED,
    NotificationCategory.EXPENSE_CREATED,
    NotificationCategory.MEAL_CREATED,
    NotificationCategory.FEEDBACK_SUBMITTED,
]

# Categories only admins can have. Choosing one is refused for anyone else (see
# users.py), and a broadcast skips a profile that is no longer an admin even if it
# still carries the category from when it was.
ADMIN_ONLY_CATEGORIES: frozenset[str] = frozenset({NotificationCategory.FEEDBACK_SUBMITTED})

# Push notification title per category — a phone's notification chrome already
# shows the app name and icon, so repeating "Ankerd Con" as the title told a
# member nothing; this tells them what it's about before they even open it.
_PUSH_TITLES: dict[str, str] = {
    NotificationCategory.EVENT_CREATED: "Nieuw evenement",
    NotificationCategory.TICKET_SALE: "Kaartverkoop",
    NotificationCategory.EVENT_REMINDER_7D: "Over een week",
    NotificationCategory.EVENT_REMINDER_1D: "Morgen",
    NotificationCategory.EVENT_REMINDER_DAY_OF: "Vandaag",
    NotificationCategory.RIDE_CREATED: "Nieuwe rit",
    NotificationCategory.EXPENSE_CREATED: "Nieuwe uitgave",
    NotificationCategory.MEAL_CREATED: "Nieuwe activiteit",
    NotificationCategory.FEEDBACK_SUBMITTED: "Nieuwe feedback",
}


def broadcast_category_dm(bot_token: str, category: str, content: str, eligible_names: set[str] | None = None) -> None:
    """Send `content` to every active, opted-in user for `category` — as a
    Discord DM (needs `allow_dm` + a linked account), a push (needs a
    subscription), or both; see the module docstring for exactly which.

    `eligible_names`, when given, further restricts who gets it on top of the
    usual category opt-in — e.g. rides.py also requires being signed up for
    that event day and not already having a ride that covers it.

    Fire-and-forget — intended for `background_tasks.add_task`. Never raises;
    a failed fetch or a single failed send must never break the caller.
    """
    try:
        profiles = (
            supabase.table(Tables.PROFILES)
            .select("name, discord_id, notification_categories, is_active, allow_dm, is_admin")
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Notification broadcast (%s): failed to fetch profiles: %s", category, e)
        return

    dm_sent = 0
    push_names: list[str] = []
    for profile in profiles:
        if not profile.get("is_active", True):
            continue
        if category not in (profile.get("notification_categories") or []):
            continue
        if category in ADMIN_ONLY_CATEGORIES and not profile.get("is_admin"):
            continue
        if eligible_names is not None and profile["name"] not in eligible_names:
            continue
        if bot_token and profile.get("allow_dm", True) and profile.get("discord_id"):
            discord_bot.send_dm(bot_token, profile["discord_id"], content)
            dm_sent += 1
        push_names.append(profile["name"])

    if dm_sent:
        logger.info("Notification broadcast (%s): DM to %d user(s)", category, dm_sent)
    title = _PUSH_TITLES.get(category, _APP_TITLE)
    push_service.send_push(get_settings(), push_names, title, push_service.headline(content, title))


def send_personal_dm(bot_token: str, profile_id: str, content: str, title: str = _APP_TITLE) -> None:
    """Notify one member about something that needs *them* — a payment
    request to them, or a payment to confirm. Not a broadcast category, so
    the Discord DM needs only the master `allow_dm` switch; push, as always,
    needs only a subscription to exist. `title` is the push notification's
    title — callers outside a category (like settlements.py) pass their own
    short description since there's no category to look one up from.

    Fire-and-forget like `broadcast_category_dm`; never raises.
    """
    if not profile_id:
        return
    try:
        rows = (
            supabase.table(Tables.PROFILES)
            .select("name, discord_id, is_active, allow_dm")
            .eq("id", profile_id)
            .execute()
            .data
        )
    except Exception as e:
        logger.error("Personal DM: failed to fetch profile %s: %s", profile_id, e)
        return
    if not rows:
        return
    profile = rows[0]
    if not profile.get("is_active", True):
        return
    if bot_token and profile.get("allow_dm", True) and profile.get("discord_id"):
        discord_bot.send_dm(bot_token, profile["discord_id"], content)
    push_service.send_push(get_settings(), [profile["name"]], title, push_service.headline(content, title))
