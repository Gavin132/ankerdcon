-- ── v1.8 — Bot DM consent + first-login tracking ─────────────────────────────

-- Tracks whether the user has logged in for the first time.
-- Used to send the welcome DM exactly once.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT true;

-- User consent for receiving bot DMs (set during onboarding, default opt-in).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_dm BOOLEAN NOT NULL DEFAULT true;

-- Existing profiles that already have a discord_id have already logged in —
-- do not send them a welcome DM on their next request.
UPDATE profiles SET is_first_login = false WHERE discord_id IS NOT NULL;
