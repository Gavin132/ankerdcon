-- ============================================================
-- Migration v2.30 — Custom profile pictures
-- ============================================================
-- Run in Supabase SQL Editor (or psql) BEFORE deploying the backend commit
-- that added this column: get_current_user's own profile lookup selects
-- avatar_custom unconditionally, so its absence fails EVERY login with
-- "column profiles.avatar_custom does not exist" on every request —
-- surfacing to members as "Kan de server niet bereiken", not just avatar
-- upload as this column's own purpose might suggest. (Hit exactly this,
-- live, on dev — the fix was running this ALTER TABLE, nothing else.)
-- ============================================================
--
-- Members can now upload their own profile picture (Profiel → Profielfoto),
-- replacing the one taken from Discord/Google. This flag stops the periodic
-- avatar resync (migration v2.29, app/dependencies.py) from quietly
-- overwriting a member's own choice with their Discord/Google picture again.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_custom boolean NOT NULL DEFAULT false;
