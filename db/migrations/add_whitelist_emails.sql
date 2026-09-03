-- ============================================================
-- Bulk-add emails to the whitelist
-- ============================================================
-- Run in the Supabase SQL Editor. Replace the emails below with your
-- real list — one per line, comma-separated, quoted. Case doesn't
-- matter, they're lowercased automatically to match how the app
-- stores and looks up whitelist entries.
--
-- Safe to re-run: anyone already on the whitelist (by email, matched
-- case-insensitively) is silently skipped instead of erroring.
-- ============================================================

INSERT INTO whitelist (email)
SELECT DISTINCT lower(trim(e))
FROM unnest(ARRAY[
  'someone@example.com',
  'someone-else@example.com',
  'another.person@example.com'
]) AS e
WHERE trim(e) <> ''
ON CONFLICT ((lower(email))) DO NOTHING;

-- Confirm what's on the whitelist now
SELECT email FROM whitelist WHERE email IS NOT NULL ORDER BY email;
