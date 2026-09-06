"""
Phase 2 data migration: repoint hotel_rooms/meals/rides/cosplays foreign
keys from the old `calendar` ids to the new `events`/`event_days` ids,
using calendar_id_mapping.json produced by backfill_events_from_calendar.py.

- meals.linked_event_id / rides.linked_event_id (a single day) and
  cosplays.linked_event_ids (an array of days) map through
  calendar_id_mapping directly: old calendar.id -> new event_days.id.
- hotel_rooms.event_id is a *group* key (old multi_day_id, or a standalone
  calendar.id) rather than a single day — mapped to the new parent
  events.id by looking up any one of its member days.
- Anything that can't be resolved (points at a calendar group/day that no
  longer exists — pre-existing orphaned data, unrelated to this migration)
  is left untouched and reported, never guessed at or deleted.

Safe to re-run: every update is derived fresh from calendar_id_mapping.json
each time.
"""
import json
import os

from app.core.database import supabase

mapping_path = os.path.join(os.path.dirname(__file__), "calendar_id_mapping.json")
with open(mapping_path) as f:
    day_mapping: dict[str, str] = json.load(f)  # old calendar.id -> new event_days.id

# Build old group-key (multi_day_id or standalone calendar.id) -> new events.id
calendar_rows = supabase.table("calendar").select("id, multi_day_id").execute().data
event_days_rows = {d["id"]: d["event_id"] for d in supabase.table("event_days").select("id, event_id").execute().data}

group_mapping: dict[str, str] = {}
for row in calendar_rows:
    old_day_id = row["id"]
    new_day_id = day_mapping.get(old_day_id)
    if not new_day_id:
        continue
    new_event_id = event_days_rows.get(new_day_id)
    if not new_event_id:
        continue
    old_group_key = row.get("multi_day_id") or old_day_id
    group_mapping[old_group_key] = new_event_id

# ── hotel_rooms.event_id (group key -> new parent event id) ────────────────
rooms = supabase.table("hotel_rooms").select("id, event_id").execute().data
resolved, orphaned = 0, []
for room in rooms:
    new_id = group_mapping.get(room["event_id"])
    if new_id:
        supabase.table("hotel_rooms").update({"event_id": new_id}).eq("id", room["id"]).execute()
        resolved += 1
    else:
        orphaned.append(room)

print(f"hotel_rooms: repointed {resolved}, unresolved/orphaned {len(orphaned)}")
for room in orphaned:
    print(f"  ORPHANED room {room['id']} -> old event_id {room['event_id']!r} (no matching calendar group found)")

# ── meals.linked_event_id / rides.linked_event_id (single day) ─────────────
for table in ("meals", "rides"):
    linked = supabase.table(table).select("id, linked_event_id").execute().data
    resolved, unresolved = 0, []
    for row in linked:
        old_id = row.get("linked_event_id")
        if not old_id:
            continue
        new_id = day_mapping.get(old_id)
        if new_id:
            supabase.table(table).update({"linked_event_id": new_id}).eq("id", row["id"]).execute()
            resolved += 1
        else:
            unresolved.append(row)
    print(f"{table}: repointed {resolved}, unresolved {len(unresolved)}")
    for row in unresolved:
        print(f"  ORPHANED {table} {row['id']} -> old linked_event_id {row['linked_event_id']!r}")

# ── cosplays.linked_event_ids (array of days) ───────────────────────────────
cosplays = supabase.table("cosplays").select("id, linked_event_ids").execute().data
resolved, unresolved = 0, 0
for c in cosplays:
    old_ids = c.get("linked_event_ids") or []
    if not old_ids:
        continue
    new_ids = []
    for old_id in old_ids:
        new_id = day_mapping.get(old_id)
        if new_id:
            new_ids.append(new_id)
            resolved += 1
        else:
            unresolved += 1
            print(f"  ORPHANED cosplay {c['id']} -> old linked id {old_id!r}")
    if new_ids != old_ids:
        supabase.table("cosplays").update({"linked_event_ids": new_ids}).eq("id", c["id"]).execute()

print(f"cosplays: repointed {resolved} links, unresolved {unresolved}")
