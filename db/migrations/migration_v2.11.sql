-- ============================================================
-- Migration v2.11 — Link expenses to an event, admin payment controls
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS linked_event_id UUID REFERENCES calendar(id) ON DELETE SET NULL;
