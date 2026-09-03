-- ============================================================
-- Migration v2.15 — Optional Hub greeting
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
--
-- Lets a user hide the "Goedemiddag / <name>" greeting at the top of the
-- Hub page if they'd rather not see it.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_greeting boolean NOT NULL DEFAULT true;
