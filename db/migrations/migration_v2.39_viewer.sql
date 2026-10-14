-- ============================================================
-- Migration v2.39 — Read-only members ("kijkers")
-- ============================================================
-- Run in Supabase SQL Editor (or psql) any time. Safe to leave unrun: the backend treats a database
-- without these columns as "nobody is read-only" (it never locks anyone out). Only making someone a
-- kijker (the admin Users page, or the box on a whitelist entry) needs them, and answers 503 until then.
-- ============================================================
--
-- A kijker can look at everything and change nothing except their own account settings: it is
-- enforced for every request in app/dependencies.py (get_current_user). `profiles.is_viewer` is the
-- flag; `whitelist.viewer` makes whoever gets in through that entry a kijker from their first login.
-- An admin is never read-only, whatever the flag says.

ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS is_viewer boolean NOT NULL DEFAULT false;
ALTER TABLE whitelist ADD COLUMN IF NOT EXISTS viewer boolean NOT NULL DEFAULT false;
