-- ── v1.6 — User management ────────────────────────────────────────────────────

-- Soft-deactivate support: inactive users are denied access at the API level
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
