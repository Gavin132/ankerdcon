"""Application-wide constants. No magic strings in routers or services."""

from __future__ import annotations


# ── Supabase table names ───────────────────────────────────────────
class Tables:
    PROFILES = "profiles"
    RIDES    = "rides"
    MEALS    = "meals"
    PAYMENTS = "payments"
    CALENDAR = "calendar"


# ── API ───────────────────────────────────────────────────────────
API_PREFIX = "/api"
