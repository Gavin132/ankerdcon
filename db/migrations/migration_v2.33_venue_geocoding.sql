-- ============================================================
-- Migration v2.33 — Venue coordinates for the crew map
-- ============================================================
-- Run in Supabase SQL Editor (or psql) BEFORE deploying the commit that added
-- these columns — unlike v2.32, this is NOT safe to leave unrun: the backend
-- writes these columns on every event/meal create and update (to geocode the
-- location), and an UPDATE/INSERT naming a column that doesn't exist yet
-- fails outright (unlike a SELECT, which just omits a missing column).
-- Leaving it unrun would break saving any event or meal, not just the map.
-- ============================================================
--
-- `location_lat`/`location_lng` (events, meals) and `hotel_location_lat`/
-- `hotel_location_lng` (events) are geocoded server-side from the existing
-- free-text location whenever it's saved (best-effort — a location that
-- can't be geocoded just means no pin, never a failed save). `meals.maps_url`
-- is a member-supplied exact Google Maps link, set from the "Etentje
-- toevoegen" sheet; when present it's used instead of the geocoded
-- coordinates for that meal's pin.

ALTER TABLE events ADD COLUMN IF NOT EXISTS location_lat double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_lng double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_location_lat double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_location_lng double precision;

ALTER TABLE meals ADD COLUMN IF NOT EXISTS location_lat double precision;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS location_lng double precision;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS maps_url text;
