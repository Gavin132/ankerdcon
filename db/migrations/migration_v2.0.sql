-- ── v2.0 — event_group_id: UUID → TEXT ─────────────────────────────────────
-- event_group_id was originally a UUID column, but is used as a human-readable
-- group name (e.g. "Comic Con"). Change to text so any string is accepted.

ALTER TABLE calendar
  ALTER COLUMN event_group_id TYPE text USING event_group_id::text;
