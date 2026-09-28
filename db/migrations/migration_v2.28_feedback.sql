-- ============================================================
-- Migration v2.28 — Member feedback
-- ============================================================
-- Run in Supabase SQL Editor (or psql), BEFORE the deploy: until it has run,
-- only sending and reading feedback answers 503; nothing else is affected.
-- ============================================================
--
-- Settings › Feedback geven saves a bug, idea or remark here; Admin › Feedback
-- lists them. `user_name` is NULL when the member chose to send it
-- anonymously, so an anonymous row never names anyone.

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('bug', 'idea', 'other')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 2000),
  user_name text,
  app_version text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback (created_at DESC);

-- Only the backend (service role) touches this table, like every other one
-- since v2.22: RLS on, no policies for anon/authenticated.
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
GRANT ALL ON feedback TO service_role;
