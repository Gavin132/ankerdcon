-- Migration v1.9: Onboarding flow
-- Run this in Supabase SQL editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_dm BOOLEAN NOT NULL DEFAULT true;

-- Mark all users who have already logged in as having completed onboarding
-- (is_first_login = false means they've gone through the first-login flow)
UPDATE profiles SET onboarding_completed = true WHERE is_first_login = false;

-- Also mark users who have discord_id (they've authenticated at least once)
UPDATE profiles SET onboarding_completed = true WHERE discord_id IS NOT NULL;
