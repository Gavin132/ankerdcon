-- ============================================================
-- Migration v2.44 — Quiet hours for notifications (profiles.quiet_hours_start / quiet_hours_end)
-- ============================================================
-- Run in Supabase SQL Editor (or psql) any time. Safe to leave unrun: without the columns the setting cannot be
-- saved (the app says so) and notifications go out as before; nothing else is affected.
-- ============================================================
--
-- Between these two hours (0-23, Dutch time) a member gets no Discord DM or push for a category notification.
-- Both NULL means no quiet hours. The window may cross midnight (start 23, end 8). A message in that window is
-- not sent later: it is skipped (the app itself still shows everything). Messages to one member about money
-- (a payment request) are not category notifications and are not held back.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quiet_hours_start smallint CHECK (quiet_hours_start BETWEEN 0 AND 23);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quiet_hours_end   smallint CHECK (quiet_hours_end   BETWEEN 0 AND 23);
