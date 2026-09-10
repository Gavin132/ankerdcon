-- ============================================================
-- Migration v2.20 — Event-day photo stories
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================
--
-- Instagram/Polarsteps-style photo story per event day: anyone can upload
-- photos to a day (story_photos), and everyone's "how far have I watched
-- this day's story" progress is tracked per (user, day) in story_seen —
-- not a single global watermark per account, since a story ring can be
-- opened in any order, same as real Instagram stories.
--
-- `seq` is a plain global identity column (not a per-day sequence — Postgres
-- sequences aren't naturally scoped "per group," and a single monotonic
-- number still gives correct per-day ordering since story_seen's watermark
-- is always compared against photos filtered to one event_day_id already).

CREATE TABLE story_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_day_id uuid NOT NULL REFERENCES event_days(id) ON DELETE CASCADE,
  seq bigint GENERATED ALWAYS AS IDENTITY,
  uploaded_by text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_story_photos_event_day ON story_photos(event_day_id, seq);

CREATE TABLE story_seen (
  user_name text NOT NULL,
  event_day_id uuid NOT NULL REFERENCES event_days(id) ON DELETE CASCADE,
  last_seen_seq bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_name, event_day_id)
);
