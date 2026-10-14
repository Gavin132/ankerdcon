-- ============================================================
-- Migration v2.40 — Videos in stories
-- ============================================================
-- Run in Supabase SQL Editor (or psql) BEFORE the deploy that lets members add videos to a story.
-- Photos keep working without it; only adding a video needs the column (answers 503 until then).
-- ============================================================
--
-- A story video is stored as it came (mp4, mov or webm, `image_url` points at it, the name of the
-- file says what it is). `poster_url` is the still frame shown in grids, the story ring and while
-- the video loads; the phone makes it, so the server does not need ffmpeg. NULL for photos.

ALTER TABLE story_photos ADD COLUMN IF NOT EXISTS poster_url text;
