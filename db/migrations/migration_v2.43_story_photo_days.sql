-- ============================================================
-- Migration v2.43 — Photos of a day with no event day (story_photos.taken_on)
-- ============================================================
-- Run in Supabase SQL Editor (or psql) any time. Safe to leave unrun: without the column the backend saves
-- such a photo on its nearest event day instead (it falls back on a failed insert), as before.
-- ============================================================
--
-- The app reads when a photo was taken and files it under that day. A photo from the day before or after an
-- event (the Friday of a Saturday + Sunday con) has no event day of its own and must not become one: event
-- days are what people sign up for and what the Agenda lists. So it is kept on the nearest event day, with
-- the date it was really taken here:
--   taken_on  NULL for a photo of the event day itself; otherwise the date, exactly one day before or after
--             a day of the event, which the trip's photo card shows as a day of its own.

ALTER TABLE story_photos ADD COLUMN IF NOT EXISTS taken_on date;
