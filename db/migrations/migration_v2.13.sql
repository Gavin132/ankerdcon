-- ============================================================
-- Migration v2.13 — Strip legacy Discord "#0" discriminator
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
--
-- Discord retired the old username#discriminator format, but every migrated
-- account was assigned discriminator "0" for backwards compatibility, so its
-- OAuth API still returns names literally as e.g. "someuser#0". The backend
-- now strips this automatically on login, but that only fixes new profiles
-- and the discord_username column on next login — existing profiles need a
-- one-time backfill.
--
-- Some tables (e.g. hotel_rooms.occupants) store a raw copy of a profile's
-- name/discord_username as a plain string rather than a foreign key. To keep
-- those old references resolving correctly (the app falls back to matching
-- on `aliases` when a stored name doesn't match `name`/`discord_username`
-- directly), the old "#0" value is preserved as an alias before stripping.
-- ============================================================

UPDATE profiles
SET aliases = array_append(aliases, discord_username)
WHERE discord_username LIKE '%#0'
  AND NOT (discord_username = ANY(aliases));

UPDATE profiles
SET aliases = array_append(aliases, name)
WHERE name LIKE '%#0'
  AND NOT (name = ANY(aliases));

UPDATE profiles SET name = left(name, length(name) - 2) WHERE name LIKE '%#0';
UPDATE profiles SET discord_username = left(discord_username, length(discord_username) - 2) WHERE discord_username LIKE '%#0';
