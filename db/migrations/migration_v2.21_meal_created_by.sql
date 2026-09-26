-- ============================================================
-- Migration v2.21 — Remember who created a meal
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================
--
-- Deleting a meal used to be open to every member. Now only the member who
-- created it (or an admin) may. Meals created before this migration have no
-- creator, so only admins can delete those.

ALTER TABLE meals ADD COLUMN IF NOT EXISTS created_by text;
