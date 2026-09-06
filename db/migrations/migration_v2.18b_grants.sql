-- migration_v2.18.sql created `events`/`event_days` via a raw CREATE TABLE,
-- which (unlike Supabase's dashboard table editor) doesn't automatically
-- grant privileges to service_role — so the backend gets "permission
-- denied" until this runs.
GRANT ALL ON public.events, public.event_days TO service_role;
