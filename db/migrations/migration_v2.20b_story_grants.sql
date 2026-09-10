-- migration_v2.20 created `story_photos`/`story_seen` via a raw CREATE
-- TABLE, which (unlike Supabase's dashboard table editor) doesn't
-- automatically grant privileges to service_role — so the backend gets
-- "permission denied" until this runs. Same issue as events/event_days,
-- fixed the same way in migration_v2.18b_grants.sql.
GRANT ALL ON public.story_photos, public.story_seen TO service_role;
