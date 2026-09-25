-- ============================================================
-- Migration v2.26 — One open settlement per pair of members
-- ============================================================
-- Run in Supabase SQL Editor (or psql), after v2.25.
-- ============================================================
--
-- The backend already refuses a second open settlement between the same two
-- members in the same currency, but it checks first and inserts after, so two
-- requests at the same moment could both get through. This index makes the
-- database itself the last word: only one settlement per pair and currency
-- can be requested or claimed at a time (confirmed ones don't count).

CREATE UNIQUE INDEX IF NOT EXISTS settlements_one_open_per_pair_idx
    ON settlements (LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id), currency)
    WHERE status IN ('requested', 'claimed');
