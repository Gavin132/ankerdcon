-- ============================================================
-- Migration v2.9 — Per-user Discord DM notification categories
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
--
-- The shared webhook channel (discord_webhook_url) is untouched by this — it
-- keeps posting everything, unconditionally, exactly as it does today. This
-- migration adds an *additional*, opt-in layer: users can choose which
-- categories they also want as a private Discord DM from the bot.
-- ============================================================

ALTER TABLE profiles   ADD COLUMN IF NOT EXISTS notification_categories TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE calendar    ADD COLUMN IF NOT EXISTS ticket_reminders_sent  TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS notify_discord       BOOLEAN NOT NULL DEFAULT false;
