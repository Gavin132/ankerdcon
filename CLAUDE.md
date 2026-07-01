# Ankerd Con — Notes for Claude

## Event grouping — two separate concepts, do NOT confuse them

### `event_group_id` (string, the group name e.g. "HDCC")
- A **label** that groups multiple unrelated events under the same named series.
- Example: all Heroes Dutch Comic Con editions share `event_group_id = "HDCC"`.
- These are **independent events** — separate RSVPs, separate participants, separate detail pages.
- Used for filtering/display in the admin panel (color-coded rows, filter chips).
- Managed via the `event_groups` table (`id`, `name`). The value stored on `calendar.event_group_id` is the group **name** string.

### `multi_day_id` (string UUID/slug)
- Marks events that are **consecutive days of the same event** (e.g. a 3-day festival).
- Events sharing the same `multi_day_id` are treated as one logical event for hotel rooms.
- These are the events where shared info (description, location, tickets, practical info) makes sense to copy across days.
- Used for hotel room grouping (`_hotel_group_key()` in `calendar.py`).

### Rule of thumb
- `event_group_id` → series label, events stay independent.
- `multi_day_id` → same event across multiple days, shared logistics.
- The RSVP/sync/shared-data features should use `multi_day_id`, not `event_group_id`.
