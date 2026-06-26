-- ── v1.7 — Event reminders ────────────────────────────────────────────────────

-- Tracks which reminder intervals have already been sent for each calendar row.
-- Values written by the scheduler: '7d', '1d', 'day_of'
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS reminders_sent TEXT[] NOT NULL DEFAULT '{}';
