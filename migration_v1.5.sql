-- Migration v1.5 — Expanded meal fields + event linking for meals and rides
-- Run this in the Supabase SQL editor

ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS linked_event_id  text,
  ADD COLUMN IF NOT EXISTS website          text,
  ADD COLUMN IF NOT EXISTS menu_url         text,
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS dietary_options  text,
  ADD COLUMN IF NOT EXISTS parking_info     text,
  ADD COLUMN IF NOT EXISTS extra_notes      text;

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS linked_event_id  text;
