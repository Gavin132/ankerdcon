-- ============================================================
-- Migration v2.8 — Site-wide announcements
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message     TEXT        NOT NULL,
  severity    TEXT        NOT NULL DEFAULT 'info',
  active      BOOLEAN     NOT NULL DEFAULT true,
  dismissible BOOLEAN     NOT NULL DEFAULT true,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO service_role;
