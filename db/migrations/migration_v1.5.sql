-- ── migration_v1.5 ────────────────────────────────────────────────────────────
-- Replaces the computed `maps_link` column on rides with `end_location`.
-- `maps_link` stored a generated Google Maps URL; `end_location` stores the
-- raw destination text instead, and the map URL is built on the fly in the app.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE rides ADD COLUMN IF NOT EXISTS end_location TEXT;
ALTER TABLE rides DROP COLUMN IF EXISTS maps_link;
