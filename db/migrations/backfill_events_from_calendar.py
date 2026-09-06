"""
Real backfill: populate `events` and `event_days` from the current
`calendar` table.

- calendar is NOT touched or deleted — this only writes to the new tables.
- Safe to re-run: it wipes and rebuilds `events`/`event_days` each time
  (both are unused by the live app until the Phase 2 cutover), so
  iterating on the merge logic is cheap.
- Every original calendar row id is tracked in a mapping saved next to this
  script (old calendar id -> new event_days id), which Phase 2 needs to
  repoint meals/rides/cosplays/hotel_rooms.

Run from backend/ with the venv active:
    PYTHONPATH=. python ../db/migrations/backfill_events_from_calendar.py
"""
import json
import os
from collections import defaultdict

from app.core.database import supabase

_WEEKDAYS = {
    "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag",
    "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
}

SHARED_FIELDS = [
    "is_hotel", "hotel_location", "image_url", "description",
    "location", "website", "ticket_url", "ticket_sale_start", "ticket_types",
    "locker_info", "parking_info", "special_instructions", "what_to_bring",
    "event_group_id",
]


def canonical_name(names: list[str]) -> str:
    """Strip a trailing weekday word (a day can otherwise legitimately have
    a different event_name than its siblings, e.g. "X Zaterdag" vs
    "X Zondag") and take the most common resulting name across the group."""
    stripped = []
    for name in names:
        words = name.strip().split()
        if words and words[-1].strip(".,").lower() in _WEEKDAYS:
            words = words[:-1]
        stripped.append(" ".join(words).strip())
    counts = defaultdict(int)
    for s in stripped:
        counts[s] += 1
    return max(counts.items(), key=lambda kv: kv[1])[0]


def first_non_null(rows: list[dict], field: str):
    for r in rows:
        v = r.get(field)
        if v not in (None, "", []):
            return v
    return None


def run() -> dict[str, str]:
    # 1. Wipe any previous backfill attempt (idempotent re-run).
    supabase.table("event_days").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("events").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    # 2. Group calendar rows by multi_day_id (a standalone row is its own group of one).
    rows = supabase.table("calendar").select("*").order("date").execute().data
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        key = row.get("multi_day_id") or f"__standalone__{row['id']}"
        groups[key].append(row)

    id_mapping: dict[str, str] = {}  # old calendar row id -> new event_days id

    for _key, group_rows in sorted(groups.items(), key=lambda kv: kv[1][0]["date"]):
        name = canonical_name([r["event_name"] for r in group_rows])
        shared = {f: first_non_null(group_rows, f) for f in SHARED_FIELDS}
        shared = {k: v for k, v in shared.items() if v is not None}

        event_row = {"event_name": name, **shared}
        new_event_id = supabase.table("events").insert(event_row).execute().data[0]["id"]

        for r in group_rows:
            day_row = {
                "event_id": new_event_id,
                "date": r["date"],
                "has_con": True,
                "participants": r.get("participants") or [],
            }
            new_day_id = supabase.table("event_days").insert(day_row).execute().data[0]["id"]
            id_mapping[r["id"]] = new_day_id

        print(f"Created event '{name}' ({new_event_id}) with {len(group_rows)} day(s)")

    mapping_path = os.path.join(os.path.dirname(__file__), "calendar_id_mapping.json")
    with open(mapping_path, "w") as f:
        json.dump(id_mapping, f, indent=2)

    print(f"\nDone. {len(groups)} events, {len(id_mapping)} days created.")
    print(f"Old-id -> new-event_days-id mapping saved to {mapping_path}")
    return id_mapping


if __name__ == "__main__":
    run()
