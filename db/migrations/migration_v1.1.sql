-- ── v2.2 — Fix schema discrepancies found by check_schema.py ────────────────
--
-- 1. payments.splits: TEXT[] -> JSONB
--    Drop the TEXT[] default first, cast, then set the correct JSONB default.
--
-- 2. profiles.created_at: add missing column (present in User model, missing in DB)

ALTER TABLE payments ALTER COLUMN splits DROP DEFAULT;
ALTER TABLE payments ALTER COLUMN splits TYPE
jsonb USING to_jsonb
(splits);
ALTER TABLE payments ALTER COLUMN splits
SET
DEFAULT '[]'::jsonb;

ALTER TABLE profiles
  ADD COLUMN
IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now
();
