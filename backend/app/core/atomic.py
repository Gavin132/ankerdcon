"""Changing a list column (participants, passengers, occupants, restaurant cars)
without losing somebody else's change.

The lists are stored as one column, so a sign-up used to be "read the list, add
a name, write the whole list back". Two people signing up in the same instant
both read the old list, and the second write threw the first person away (or two
people took the last seat). `update_list` writes the new list only if the column
still holds what was read, and otherwise reads again and redoes the change: a
compare-and-swap done with a filter on the update, so it needs nothing from the
database beyond what is already there.
"""
from __future__ import annotations

import json
from typing import Any, Callable

from fastapi import HTTPException, status

from app.core.database import supabase
from app.core.logging import get_logger

logger = get_logger(__name__)

# A change is retried this many times when someone else changed the list first.
# With a friend group, one retry is already rare.
ATTEMPTS = 6

_BUSY = "Er wordt net iets anders aangepast. Probeer het opnieuw."
_DB_ERROR = "Databasefout. Probeer het opnieuw."


def _text_array_literal(items: list[str]) -> str:
    """A Postgres text[] literal, `{"a","b c"}`, with every element quoted."""
    quoted = ('"' + str(i).replace("\\", "\\\\").replace('"', '\\"') + '"' for i in items)
    return "{" + ",".join(quoted) + "}"


def _matches(query: Any, column: str, old: Any, jsonb: bool):
    """Restrict an update to the row only while `column` still equals `old`."""
    if old is None:
        return query.is_(column, "null")
    if jsonb:
        return query.filter(column, "eq", json.dumps(old, separators=(",", ":"), ensure_ascii=False))
    return query.filter(column, "eq", _text_array_literal(old))


def update_list(
    table: str,
    row_id: str,
    column: str,
    change: Callable[[list, dict], list | None],
    *,
    select: str | None = None,
    jsonb: bool = False,
    not_found: str = "Niet gevonden.",
) -> tuple[dict, list]:
    """Apply `change` to the list in `column` of one row, safely.

    `change(current_list, row)` returns the new list, or None for "nothing to
    do". `row` holds the columns named in `select` (default: just `column`),
    for checks such as a ride's seats or a room's capacity. It may raise an
    HTTPException, and it runs again on fresh data when a retry is needed, so a
    "ride is full" check is always made against the latest list.

    Returns (row, list as it is now). Raises 404 when the row is missing and
    503 when the database fails or stays busy.
    """
    columns = select or column
    for _ in range(ATTEMPTS):
        try:
            rows = supabase.table(table).select(columns).eq("id", row_id).execute().data
        except Exception as e:
            logger.error("Failed to read %s.%s of %s: %s", table, column, row_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found)

        row = rows[0]
        old = row.get(column)
        current = list(old or [])
        new = change(json.loads(json.dumps(current)), row)  # deep copy: `change` may edit in place
        if new is None or new == current:
            return row, current

        try:
            query = supabase.table(table).update({column: new}).eq("id", row_id)
            done = _matches(query, column, old, jsonb).execute().data
        except Exception as e:
            logger.error("Failed to update %s.%s of %s: %s", table, column, row_id, e)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_DB_ERROR)
        if done:
            return row, new
        logger.info("%s.%s of %s changed underneath a write; retrying", table, column, row_id)

    logger.warning("%s.%s of %s stayed busy for %d attempts", table, column, row_id, ATTEMPTS)
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=_BUSY)
