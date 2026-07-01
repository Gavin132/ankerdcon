-- Cosplays feature
-- Run this migration in the Supabase SQL editor.

create table if not exists cosplays (
  id               uuid        primary key default gen_random_uuid(),
  user_name        text        not null,
  character_name   text        not null,
  series           text,
  notes            text,
  inspo_images     text[]      not null default '{}',
  linked_event_ids text[]      not null default '{}',
  created_at       timestamptz not null  default now()
);

-- Index for filtering by event
create index if not exists cosplays_linked_event_ids_idx
  on cosplays using gin (linked_event_ids);

-- Grant access to Supabase roles
grant all on public.cosplays to service_role;
grant all on public.cosplays to authenticated;
grant all on public.cosplays to anon;

-- ── Supabase Storage ────────────────────────────────────────────────────────
-- Create a PUBLIC bucket named "cosplay-images" in the Supabase Dashboard:
--   Storage → New bucket → Name: cosplay-images → Public: ON
-- No SQL needed; bucket creation is done via the dashboard UI.
