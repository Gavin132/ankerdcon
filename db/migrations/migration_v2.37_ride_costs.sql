-- ============================================================
-- Migration v2.37 — Ride costs (what passengers owe the driver)
-- ============================================================
-- Run in Supabase SQL Editor (or psql), BEFORE the deploy: until it has run, the
-- ride-cost overview in Financiën answers 503 and entering a bill or a distance
-- fails; nothing else is affected.
-- ============================================================
--
-- NOTE: the app later dropped the by-distance sharing described below. Now a driver enters one amount
-- (stored in total_amount; parking_amount stays 0) shared equally by the people who went to the trip in
-- their car, and rides.distance_km / distance_source are unused. Nothing here needs undoing.
--
-- A driver enters what the whole trip cost them in fuel and tolls, and separately what they paid
-- for parking. The first is shared over the rides they drove, by distance, and over the people in
-- each car; the second by the people who went with them on their first Heen. See
-- app/services/ride_costs.py.
--
-- `rides.distance_km` is the length of one ride, kept so it is looked up once. Where it
-- came from is in `distance_source`: 'route' (a driving route between the two places),
-- 'straight' (an estimate from the straight line, when no route could be found) or
-- 'manual' (typed by the driver, who always has the last word).
--
-- `trip_id` is plain text with no foreign key, like parking_spots.trip_id: the app's trip
-- id is `multi_day_id || id`, so a single-day trip's id is an event_days.id.

ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_km numeric(7,1);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_source text
  CHECK (distance_source IN ('route', 'straight', 'manual'));

CREATE TABLE IF NOT EXISTS ride_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text NOT NULL,
  driver text NOT NULL,
  total_amount numeric(8,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  parking_amount numeric(8,2) NOT NULL DEFAULT 0 CHECK (parking_amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, driver)
);

-- For a database where an earlier draft of this migration already ran: parking is its own amount, and
-- the fuel amount may be 0 when only parking was entered.
ALTER TABLE ride_costs ADD COLUMN IF NOT EXISTS parking_amount numeric(8,2) NOT NULL DEFAULT 0 CHECK (parking_amount >= 0);
ALTER TABLE ride_costs ALTER COLUMN total_amount SET DEFAULT 0;
ALTER TABLE ride_costs DROP CONSTRAINT IF EXISTS ride_costs_total_amount_check;
ALTER TABLE ride_costs ADD CONSTRAINT ride_costs_total_amount_check CHECK (total_amount >= 0);

CREATE INDEX IF NOT EXISTS ride_costs_trip_idx ON ride_costs (trip_id);

ALTER TABLE ride_costs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON ride_costs TO service_role;
