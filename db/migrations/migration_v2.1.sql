-- ── v2.1 — Event groups ─────────────────────────────────────────────────────
-- Stores named event groups (e.g. "Comic Con") that events can be linked to.

CREATE TABLE IF NOT EXISTS event_groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_groups TO service_role;
