-- ============================================================
-- Migration v2.34 — Exact Maps links for the con and hotel location
-- ============================================================
-- Run in Supabase SQL Editor (or psql) BEFORE deploying the commit that
-- added these columns — same reason as v2.33: the backend can write them on
-- an event save, and an update naming a column that doesn't exist yet fails
-- outright.
-- ============================================================
--
-- Same idea as meals.maps_url (v2.33): a geocoded address doesn't always
-- land on the right spot — a hotel chain's generic name can resolve to a
-- location in a different city entirely, or not resolve at all. These are
-- optional admin-set overrides, used for that pin's route on the crew map
-- instead of the geocoded coordinates when given. The pin itself still needs
-- the location text to be geocoded (or to have been before); a Maps link
-- alone doesn't place a pin, only redirects the route once there is one —
-- same caveat as meals.maps_url.

ALTER TABLE events ADD COLUMN IF NOT EXISTS location_maps_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_location_maps_url text;
