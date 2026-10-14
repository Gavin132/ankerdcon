-- ============================================================
-- Migration v2.38 — "Alleen voor mijn trips" (notifications)
-- ============================================================
-- Run in Supabase SQL Editor (or psql) any time. Safe to leave unrun for a while: the
-- backend asks for the column, falls back to a query without it when it is missing, and
-- then treats every member as being on the default (on). Only changing the switch in the
-- notification settings needs the column, and answers 503 until it exists.
-- ============================================================
--
-- When on (the default), a member only gets the notification for a new activity or a new
-- expense when they are going on that trip (or share in the bill). Turn it off to hear about
-- every trip. Rides already worked this way.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_own_trips_only boolean NOT NULL DEFAULT true;
