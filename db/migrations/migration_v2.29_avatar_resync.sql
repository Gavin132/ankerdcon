-- ============================================================
-- Migration v2.29 — Periodic avatar resync
-- ============================================================
-- Run in Supabase SQL Editor (or psql) BEFORE deploying the backend commit
-- that added this column: get_current_user's own profile lookup selects
-- avatar_synced_at unconditionally, so its absence fails EVERY login with
-- "column profiles.avatar_synced_at does not exist" on every request —
-- surfacing to members as "Kan de server niet bereiken" — not just the
-- resync this column is actually for. (The sibling column in v2.30 hit this
-- exact failure live on dev; this one shares the same select, same risk.)
-- ============================================================
--
-- Until now, a profile's avatar_url was only ever filled in once, the first
-- time it was empty, and then frozen forever: if a member's Discord/Google
-- picture later changed, or the stored image URL stopped resolving, the app
-- kept showing the old (now broken) one with no way to notice or recover.
-- This column lets the backend re-check the avatar periodically (see
-- _finalize_returning_user in app/dependencies.py) instead of only once.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_synced_at timestamptz;
