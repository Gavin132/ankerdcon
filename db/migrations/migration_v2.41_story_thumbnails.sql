-- ============================================================
-- Migration v2.41 — Thumbnails and previews of story photos
-- ============================================================
-- Run in Supabase SQL Editor (or psql) any time. Safe to leave unrun: without the columns the backend
-- saves photos without the lighter copies (it falls back on a failed insert) and the app shows the
-- original everywhere, as before. Run it, then the backfill (see below), to get the saving.
-- ============================================================
--
-- Every story photo gets two WebP copies next to the original, made by the backend when it is
-- uploaded (app/core/thumbnails.py):
--   thumb_url    480 px on the long side, for grids, the story ring and profiles. A video's thumbnail is
--                made from its poster frame.
--   preview_url  1280 px, for the story viewer. Only for a photo clearly bigger than that: NULL means
--                "the original is small enough, show it".
-- NULL for photos added before this migration, until the backfill has made theirs:
--   cd backend && python -m scripts.backfill_story_previews
-- The original (image_url) is never changed: downloads and the zip still hand out the full file.

ALTER TABLE story_photos ADD COLUMN IF NOT EXISTS thumb_url text;
ALTER TABLE story_photos ADD COLUMN IF NOT EXISTS preview_url text;
