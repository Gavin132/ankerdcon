-- ============================================================
-- Migration v2.10 — Hotel location for quick-ride shortcuts
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
--
-- Lets an admin set the hotel's address/name once per hotel event, so the
-- hub's "ride to hotel" / "ride to convention" quick-create popup can
-- pre-fill start/end locations without asking the user to type anything.
-- ============================================================

ALTER TABLE calendar ADD COLUMN IF NOT EXISTS hotel_location TEXT;
