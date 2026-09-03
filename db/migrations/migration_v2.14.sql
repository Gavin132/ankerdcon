-- ============================================================
-- Migration v2.14 — Google login
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
--
-- Up to now every identity in this app was Discord-shaped: the whitelist is
-- keyed by discord_id, and profiles are looked up/created from Discord OAuth
-- metadata (name, avatar, provider_id). Google logins don't carry that
-- Discord identity at all, so both the whitelist and profiles need an
-- email-based identity path alongside the existing Discord one.
-- ============================================================

-- ── Whitelist: support email entries alongside discord_id ──────────────────
-- Was `discord_id TEXT PRIMARY KEY` (so every row needed a discord_id). Move
-- to a surrogate id so a row can carry just an email instead.
ALTER TABLE whitelist ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE whitelist ADD COLUMN IF NOT EXISTS email text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whitelist_pkey'
  ) THEN
    ALTER TABLE whitelist DROP CONSTRAINT whitelist_pkey;
  END IF;
END $$;

ALTER TABLE whitelist ALTER COLUMN id SET NOT NULL;
ALTER TABLE whitelist ADD PRIMARY KEY (id);
ALTER TABLE whitelist ALTER COLUMN discord_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whitelist_discord_id_key'
  ) THEN
    ALTER TABLE whitelist ADD CONSTRAINT whitelist_discord_id_key UNIQUE (discord_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whitelist_email ON whitelist (lower(email));

ALTER TABLE whitelist DROP CONSTRAINT IF EXISTS whitelist_has_identifier;
ALTER TABLE whitelist ADD CONSTRAINT whitelist_has_identifier
  CHECK (discord_id IS NOT NULL OR email IS NOT NULL);

-- ── Profiles: email as the identity anchor for non-Discord logins ──────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles (lower(email)) WHERE email IS NOT NULL;
