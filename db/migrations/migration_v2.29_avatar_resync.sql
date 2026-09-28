-- ============================================================
-- Migration v2.29 — Periodic avatar resync
-- ============================================================
-- Run in Supabase SQL Editor (or psql), any time — the backend already
-- tolerates the column being absent (nothing crashes), it just never
-- refreshes an avatar until this has run.
-- ============================================================
--
-- Until now, a profile's avatar_url was only ever filled in once, the first
-- time it was empty, and then frozen forever: if a member's Discord/Google
-- picture later changed, or the stored image URL stopped resolving, the app
-- kept showing the old (now broken) one with no way to notice or recover.
-- This column lets the backend re-check the avatar periodically (see
-- _finalize_returning_user in app/dependencies.py) instead of only once.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_synced_at timestamptz;
