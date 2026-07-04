-- ============================================================
-- Migration v2.7 — Event cover image
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================

ALTER TABLE calendar ADD COLUMN IF NOT EXISTS image_url TEXT;
