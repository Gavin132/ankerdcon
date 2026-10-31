"""A member's own data as one document: what the app has stored about them, for "Mijn gegevens downloaden".

Everything is found by the names the member goes by (their name and the former names they own), because that is
how the app stores people: as text in lists and columns, not as ids (see `profile_merge`, which lists the same
places). It only ever reads, and only what is the member's own: their rows, never other people's.
"""
from __future__ import annotations

from typing import Any, Callable

from fastapi import HTTPException, status

from app.constants import Tables
from app.core.database import supabase
from app.core.logging import get_logger

logger = get_logger(__name__)

_DB_ERROR = "Databasefout. Probeer het opnieuw."

# A profile holds a login hash only for old accounts; it is never given out, and neither are the push keys.
_PROFILE_HIDDEN = {"passcode"}


def _missing_table(error: Exception) -> bool:
    return any(m in str(error) for m in ("PGRST205", "PGRST204", "42P01", "does not exist", "schema cache"))


def _rows(table: str, keep: Callable[[dict], bool], columns: str = "*", *, optional: bool = False) -> list[dict]:
    """The rows of `table` that `keep` accepts. `optional` is for tables a later migration adds."""
    try:
        rows = supabase.table(table).select(columns).execute().data or []
    except Exception as e:
        if optional and _missing_table(e):
            return []
        logger.error("Export: failed to read %s: %s", table, e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
    return [r for r in rows if keep(r)]


def _only(rows: list[dict], *columns: str) -> list[dict]:
    return [{c: r.get(c) for c in columns} for r in rows]


def build_export(profile: dict, names: list[str]) -> dict[str, Any]:
    """`profile` is the member's own row, `names` every name they appear under."""
    mine = set(names)
    in_list = lambda value: bool(mine.intersection(value or []))  # noqa: E731

    events = {e["id"]: e.get("event_name") for e in _rows(Tables.EVENTS, lambda _: True, "id, event_name")}
    days = _rows(Tables.EVENT_DAYS, lambda d: in_list(d.get("participants")), "id, event_id, date, participants")
    trip_days = [{"event": events.get(d["event_id"]), "date": d.get("date")} for d in days]
    trip_days.sort(key=lambda d: str(d["date"]))

    rides = _rows(Tables.RIDES, lambda r: r.get("driver") in mine or in_list(r.get("passengers")))
    meals = _rows(Tables.MEALS, lambda m: in_list(m.get("participants")) or m.get("created_by") in mine)
    expenses = _rows(Tables.EXPENSES, lambda e: e.get("paid_by") in mine)
    shares = _rows(Tables.EXPENSE_SHARES, lambda s: s.get("participant") in mine)
    return {
        "profile": {k: v for k, v in profile.items() if k not in _PROFILE_HIDDEN},
        "names": names,
        "trip_days": trip_days,
        "rides": [{**_only([r], "direction", "departure_time", "start_location", "end_location")[0],
                   "as": "bestuurder" if r.get("driver") in mine else "passagier"} for r in rides],
        "meals": _only(meals, "meal_name", "time", "location", "cost"),
        "expenses_paid": _only(expenses, "description", "amount", "created_at"),
        "expense_shares": _only(shares, "amount", "status"),
        "cosplays": _rows(Tables.COSPLAYS, lambda c: c.get("user_name") in mine),
        "photos": _only(_rows(Tables.STORY_PHOTOS, lambda p: p.get("uploaded_by") in mine), "image_url", "taken_on", "created_at"),
        "ticket_votes": _only(_rows(Tables.TICKET_VOTES, lambda v: v.get("voter") in mine, optional=True), "choice", "updated_at"),
        "feedback": _rows(Tables.FEEDBACK, lambda f: f.get("user_name") in mine, optional=True),
    }
