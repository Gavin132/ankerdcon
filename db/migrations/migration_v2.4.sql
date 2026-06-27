-- v2.4 — Add multi_day_id to calendar
-- Links specific calendar events together as a multi-day event.
-- Different from event_group_id (brand/name label); this is a date-proximity grouping.
-- Value is a short auto-generated ID shared between related events (e.g. "mdg_a1b2c3d4").

ALTER TABLE calendar
  ADD COLUMN IF NOT EXISTS multi_day_id TEXT;
