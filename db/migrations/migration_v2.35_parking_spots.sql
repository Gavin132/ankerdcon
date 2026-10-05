-- ============================================================
-- Migration v2.35 — Parking spots on the crew map
-- ============================================================
-- Run in Supabase SQL Editor (or psql), BEFORE the deploy: until it has run,
-- setting a parking spot answers 503; nothing else is affected.
-- ============================================================
--
-- One row per (trip, driver): "Driver A's car is parked here." Keyed by the
-- driver's name, not a specific ride row — the same driver may have a
-- separate Inbound ride (that brought the car) and, once planned, an
-- Outbound one (that takes it home); the pin always resolves to whichever
-- of those is current at display time, not a value stored here. Whoever is
-- on one of that driver's rides for this trip (the driver or a passenger,
-- either direction) may set or correct it — it doesn't matter who actually
-- places the pin, only whose car it is. `UNIQUE (trip_id, driver)` means a
-- second person correcting the spot updates the same row instead of adding
-- a duplicate pin.
--
-- `trip_id` is deliberately plain text with no foreign key, not a `uuid`
-- referencing `events`: the frontend's own notion of "trip id" is
-- `multi_day_id || id` (see CLAUDE.md's events/days/series section) — a
-- single-day trip's "trip id" is actually an `event_days.id`, not an
-- `events.id`. The backend resolves either shape back to a set of day ids
-- (app/routers/parking.py's _day_ids_for_trip), same ambiguity the frontend
-- already lives with everywhere else.

CREATE TABLE IF NOT EXISTS parking_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text NOT NULL,
  driver text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  placed_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, driver)
);

CREATE INDEX IF NOT EXISTS parking_spots_trip_idx ON parking_spots (trip_id);

ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;
GRANT ALL ON parking_spots TO service_role;
