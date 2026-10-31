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

from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import get_settings
from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger
from app import messages
from app.services import discord_bot, push_service

logger = get_logger(__name__)

_APP_TITLE = "Ankerd Con"

# Where a new-user notification leads: the admin page where a placeholder is merged.
_NEW_USER_PATH = "/admin/users"


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
    NEW_USER = "new_user"
    TICKET_VOTE = "ticket_vote"
    # Not one to choose (so not in ALL_CATEGORIES): every active admin gets it, see `broadcast_category_dm(admins_always=True)`.
    ACCOUNT_DELETION = "account_deletion"


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
    NotificationCategory.NEW_USER,
    NotificationCategory.TICKET_VOTE,
]

# Categories only admins can have. Choosing one is refused for anyone else (see
# users.py), and a broadcast skips a profile that is no longer an admin even if it
# still carries the category from when it was.
ADMIN_ONLY_CATEGORIES: frozenset[str] = frozenset(
    {NotificationCategory.FEEDBACK_SUBMITTED, NotificationCategory.NEW_USER}
)

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
    NotificationCategory.NEW_USER: "Nieuwe gebruiker",
    NotificationCategory.TICKET_VOTE: "Ticket poll",
    NotificationCategory.ACCOUNT_DELETION: "Account verwijderen",
}


def trip_names_for_day(day_id: str | None) -> set[str] | None:
    """Everyone signed up for any day of the trip this event day belongs to: the people a notification
    about that trip is for. None when there is no such day, or it cannot be read, meaning "no trip to
    narrow it to" (the notification then goes to everyone who asked for it)."""
    if not day_id:
        return None
    try:
        day = supabase.table(Tables.EVENT_DAYS).select("event_id").eq("id", day_id).execute().data
        if not day:
            return None
        days = supabase.table(Tables.EVENT_DAYS).select("participants").eq("event_id", day[0]["event_id"]).execute().data
    except Exception as e:
        logger.warning("Could not read who goes on the trip of day %s: %s", day_id, e)
        return None
    return {name for d in days for name in (d.get("participants") or [])}


def in_quiet_hours(start: int | None, end: int | None, hour: int) -> bool:
    """Whether `hour` (0-23) falls in a member's quiet hours: from `start` up to, not including, `end`,
    which may run past midnight (23 to 8). Without both there are none."""
    if start is None or end is None or start == end:
        return False
    return start <= hour < end if start < end else hour >= start or hour < end


def _local_hour() -> int:
    """The hour it is for the members: they set their quiet hours in Dutch time."""
    return datetime.now(ZoneInfo("Europe/Amsterdam")).hour


def _fetch_profiles(category: str) -> list[dict]:
    """The profiles a broadcast chooses from. Asks for the own-trips and quiet-hours settings too, but a database
    that does not have those columns yet (the migrations have not run) must not silence every notification."""
    columns = "name, discord_id, notification_categories, is_active, allow_dm, is_admin"
    for extra in ("notify_own_trips_only, quiet_hours_start, quiet_hours_end", "notify_own_trips_only"):
        try:
            return supabase.table(Tables.PROFILES).select(f"{columns}, {extra}").execute().data
        except Exception as e:
            logger.warning("Notification broadcast (%s): settings (%s) unavailable, ignoring them: %s", category, extra, e)
    return supabase.table(Tables.PROFILES).select(columns).execute().data


def broadcast_category_dm(
    bot_token: str,
    category: str,
    content: str,
    eligible_names: set[str] | None = None,
    trip_names: set[str] | None = None,
    url: str = "/",
    admins_always: bool = False,
) -> None:
    """Send `content` to every active, opted-in user for `category` — as a
    Discord DM (needs `allow_dm` + a linked account), a push (needs a
    subscription), or both; see the module docstring for exactly which.

    `eligible_names`, when given, further restricts who gets it on top of the
    usual category opt-in — e.g. rides.py also requires being signed up for
    that event day and not already having a ride that covers it.

    `trip_names` is who the notification is about (see trip_names_for_day). A member who keeps
    "alleen voor mijn trips" on (the default) only gets it when they are in that set; one who
    switched it off gets everything they opted in to, as before.

    `url` is the page a tapped push notification opens (a path in the app).

    `admins_always` is for what an admin must not miss and so cannot be switched off (a member asking for their
    account to be deleted): it goes to every active admin, whatever categories they chose, and to nobody else.

    Fire-and-forget — intended for `background_tasks.add_task`. Never raises;
    a failed fetch or a single failed send must never break the caller.
    """
    try:
        profiles = _fetch_profiles(category)
    except Exception as e:
        logger.error("Notification broadcast (%s): failed to fetch profiles: %s", category, e)
        return

    dm_sent = 0
    push_names: list[str] = []
    hour = _local_hour()
    for profile in profiles:
        if not profile.get("is_active", True):
            continue
        if in_quiet_hours(profile.get("quiet_hours_start"), profile.get("quiet_hours_end"), hour):
            continue
        if admins_always:
            if not profile.get("is_admin"):
                continue
        elif category not in (profile.get("notification_categories") or []):
            continue
        if category in ADMIN_ONLY_CATEGORIES and not profile.get("is_admin"):
            continue
        if eligible_names is not None and profile["name"] not in eligible_names:
            continue
        if trip_names is not None and profile.get("notify_own_trips_only", True) and profile["name"] not in trip_names:
            continue
        if bot_token and profile.get("allow_dm", True) and profile.get("discord_id"):
            discord_bot.send_dm(bot_token, profile["discord_id"], content)
            dm_sent += 1
        push_names.append(profile["name"])

    if dm_sent:
        logger.info("Notification broadcast (%s): DM to %d user(s)", category, dm_sent)
    title = _PUSH_TITLES.get(category, _APP_TITLE)
    push_service.send_push(get_settings(), push_names, title, push_service.headline(content, title), url)


def notify_new_user(bot_token: str, name: str, app_url: str = "") -> None:
    """Tell the admins who asked to hear about it that somebody logged in for the first time, so
    they know there may be a placeholder profile to merge (Admin → Gebruikers). Category
    `new_user`: admins only, off by default; `broadcast_category_dm` skips anyone who is no
    longer an admin or active. Fire-and-forget, never raises.
    """
    try:
        base = (app_url or "").rstrip("/")
        content = messages.DM_NEW_USER.format(
            name=discord_bot.escape_markdown(name),
            link_line=f"\n{base}{_NEW_USER_PATH}" if base else "",
        )
        broadcast_category_dm(bot_token, NotificationCategory.NEW_USER, content, url=_NEW_USER_PATH)
    except Exception as e:
        logger.error("New-user notification for %s failed: %s", name, e)


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
