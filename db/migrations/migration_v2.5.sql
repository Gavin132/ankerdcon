-- Migration v2.5 — Hotel Rooms
-- Creates a dedicated table for hotel room management per event.

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     TEXT        NOT NULL,
  room_number  TEXT        NOT NULL,
  floor        TEXT,
  instructions TEXT,
  occupants    TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotel_rooms_event_id ON hotel_rooms(event_id);

-- Grant full access to service_role (used by the backend via Supabase client)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_rooms TO service_role;
-- If you use the anon/authenticated roles via RLS, add policies instead:
-- ALTER TABLE hotel_rooms ENABLE ROW LEVEL SECURITY;
