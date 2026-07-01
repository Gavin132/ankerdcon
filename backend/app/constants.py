"""Application-wide constants. No magic strings in routers or services."""

from __future__ import annotations


# ── Supabase table names ───────────────────────────────────────────
class Tables:
    PROFILES     = "profiles"
    RIDES        = "rides"
    MEALS        = "meals"
    PAYMENTS     = "payments"
    CALENDAR     = "calendar"
    BADGES       = "badges"
    EVENT_GROUPS = "event_groups"
    HOTEL_ROOMS  = "hotel_rooms"
    COSPLAYS       = "cosplays"
    EXPENSES       = "expenses"
    EXPENSE_SHARES = "expense_shares"


# ── API ───────────────────────────────────────────────────────────
API_PREFIX = "/api"
