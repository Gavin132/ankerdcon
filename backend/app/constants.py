"""Application-wide constants. No magic strings in routers or services."""

from __future__ import annotations


# ── Supabase table names ───────────────────────────────────────────
class Tables:
    PROFILES     = "profiles"
    RIDES        = "rides"
    MEALS        = "meals"
    PAYMENTS     = "payments"
    EVENTS       = "events"
    EVENT_DAYS   = "event_days"
    BADGES       = "badges"
    EVENT_GROUPS = "event_groups"
    HOTEL_ROOMS  = "hotel_rooms"
    COSPLAYS       = "cosplays"
    EXPENSES       = "expenses"
    EXPENSE_SHARES = "expense_shares"
    ANNOUNCEMENTS  = "announcements"
    CHANGELOG_ENTRIES = "changelog_entries"
    WHITELIST      = "whitelist"
    STORY_PHOTOS   = "story_photos"
    STORY_SEEN     = "story_seen"


# ── API ───────────────────────────────────────────────────────────
API_PREFIX = "/api"
