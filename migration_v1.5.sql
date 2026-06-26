-- ── v1.5 — Badges ─────────────────────────────────────────────────────────────

-- Badge definitions (managed by admins)
CREATE TABLE IF NOT EXISTS badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  image_url   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add badge array to user profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS badge_ids UUID[] NOT NULL DEFAULT '{}';

-- Badge display order (lower = shown first)
ALTER TABLE badges ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Grant backend (service_role) full access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO service_role;
