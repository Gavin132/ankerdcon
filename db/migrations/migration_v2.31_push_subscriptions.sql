-- ============================================================
-- Migration v2.31 — Web push subscriptions
-- ============================================================
-- Run in Supabase SQL Editor (or psql), BEFORE the deploy: until it has run,
-- subscribing to push answers 503; nothing else is affected. Also needs
-- VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT in the backend's .env
-- (see docs/deployment.md#web-push) — generated once, not per install.
-- ============================================================
--
-- One row per subscribed browser/device (a member can have several — phone
-- and laptop, say). `endpoint` is the push service's own per-device URL, so
-- it alone is the natural unique key: resubscribing the same device upserts
-- instead of duplicating, and it's also what a stale/expired subscription is
-- looked up and deleted by when a push comes back 404/410.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_name);

-- Only the backend (service role) touches this table, like every other one
-- since v2.22: RLS on, no policies for anon/authenticated.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON push_subscriptions TO service_role;
