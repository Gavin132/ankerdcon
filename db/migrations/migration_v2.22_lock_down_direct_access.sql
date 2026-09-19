-- ============================================================
-- Migration v2.22 — No direct database or storage access from browsers
-- ============================================================
-- Run in Supabase SQL Editor (or psql), AFTER deploying the backend and
-- frontend from the same release: the admin image uploads move to the
-- backend in that release, and this migration closes the old browser path.
-- ============================================================
--
-- Why: anyone with a Discord or Google account can sign in to this Supabase
-- project and get a token for the `authenticated` role — the whitelist is
-- only enforced by our backend. With that token they could talk to the
-- database and storage directly (the API key is public, it ships in the
-- frontend), skipping every check the backend makes.
--
-- The app never needs that path: the frontend uses Supabase only to log in,
-- and the backend uses the service role, which none of this affects.

-- ── 1. Tables, sequences and functions: no access for anon / authenticated ──

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- …and the same for tables created from now on (Supabase grants new tables
-- to anon/authenticated by default).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- ── 2. Row level security on every table, with no policies ─────────────────
-- A second lock behind the grants above: even if a grant comes back (a new
-- table, a dashboard click), RLS without policies still returns nothing.
-- The service role bypasses RLS.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- The expenses migration (v2.6) let any signed-in user read, add and delete
-- every expense and share.
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;
DROP POLICY IF EXISTS "shares_select"   ON expense_shares;
DROP POLICY IF EXISTS "shares_insert"   ON expense_shares;
DROP POLICY IF EXISTS "shares_update"   ON expense_shares;
DROP POLICY IF EXISTS "shares_delete"   ON expense_shares;

-- ── 3. Storage: no browser uploads, no listing ─────────────────────────────
-- Banners, event covers and badges are all uploaded by the backend now.
-- Public buckets keep serving their files by URL without any policy; these
-- policies only ever allowed browsers to upload, change, delete or list.

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    RAISE NOTICE 'Dropping storage policy: %', p.policyname;
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- ── Check ───────────────────────────────────────────────────────────────────
-- Should return no rows: tables in public that anon/authenticated can still touch.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');
