-- ============================================================
-- Migration v2.32 — Event type tags (Con / Gathering / Concert)
-- ============================================================
-- Run in Supabase SQL Editor (or psql) any time — unlike v2.29/v2.30, this is
-- safe to leave unrun for a while: every read of the events table uses
-- `select("*")` (not a named column list), which PostgREST simply omits a
-- missing column from rather than erroring on, so every trip just shows no
-- tag until this has run. Only setting one (the admin event editor) needs
-- the column to already exist, and fails with a clear 503 until it does.
-- ============================================================
--
-- Replaces the old `is_party` boolean (which only ever meant "gathering")
-- with a proper tag, shown at the top of the trip's ticket card: 'con',
-- 'gathering', 'concert', or NULL for a plain trip (the "Reis" fallback).
-- `is_party` is left in place, unread by the app from here on — a later
-- migration can drop it once this has been live a while (see TODO.md).

ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text
  CHECK (event_type IN ('con', 'gathering', 'concert'));

UPDATE events SET event_type = 'gathering' WHERE is_party = true AND event_type IS NULL;
