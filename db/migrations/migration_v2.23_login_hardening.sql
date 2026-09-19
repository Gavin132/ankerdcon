-- ============================================================
-- Migration v2.23 — Login hardening
-- ============================================================
-- Run in Supabase SQL Editor (or psql). Safe to run more than once.
-- ============================================================

-- ── 1. No automatic profiles ────────────────────────────────────────────────
-- An older setup script created a trigger that inserts a profile for every
-- new Supabase login. The backend looks profiles up by that id before it
-- checks the whitelist, so with the trigger live anyone with a Discord or
-- Google account got in. Profiles are only created by the backend now.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ── 2. Profiles that exist without a whitelist entry ────────────────────────
-- If the trigger above was live, these rows are how. Review the list: remove
-- the ones that shouldn't be there (Admin › Gebruikers), and add the real
-- members to the whitelist. Nothing is changed automatically.

SELECT p.id, p.name, p.discord_id, p.email, p.created_at
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM whitelist w
  WHERE (w.discord_id IS NOT NULL AND w.discord_id = p.discord_id)
     OR (w.email IS NOT NULL AND lower(w.email) = lower(p.email))
)
ORDER BY p.created_at DESC;

-- ── 3. One profile per name ─────────────────────────────────────────────────
-- Many tables record people by name, and the backend resolves "who is this"
-- by name in places, so two profiles with the same name (ignoring case)
-- would share each other's sign-ups and rights. The backend now picks a
-- free name for new profiles; this index makes the database refuse a clash.
-- If duplicates already exist, they're listed and the index is skipped:
-- rename one of each pair, then run this migration again.

DO $$
DECLARE
  dup record;
  found boolean := false;
BEGIN
  FOR dup IN
    SELECT lower(name) AS lname, array_agg(name) AS names
    FROM profiles GROUP BY lower(name) HAVING count(*) > 1
  LOOP
    found := true;
    RAISE NOTICE 'Duplicate profile name: %', dup.names;
  END LOOP;

  IF found THEN
    RAISE NOTICE 'Unique name index NOT created. Rename the duplicates above and run again.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_name_lower_key ON profiles (lower(name));
  END IF;
END $$;
