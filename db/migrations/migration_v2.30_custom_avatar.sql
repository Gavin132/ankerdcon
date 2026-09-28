-- ============================================================
-- Migration v2.30 — Custom profile pictures
-- ============================================================
-- Run in Supabase SQL Editor (or psql), any time — the backend already
-- tolerates the column being absent (an upload would just fail with a 503
-- until this has run; nothing else is affected).
-- ============================================================
--
-- Members can now upload their own profile picture (Profiel → Profielfoto),
-- replacing the one taken from Discord/Google. This flag stops the periodic
-- avatar resync (migration v2.29, app/dependencies.py) from quietly
-- overwriting a member's own choice with their Discord/Google picture again.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_custom boolean NOT NULL DEFAULT false;
