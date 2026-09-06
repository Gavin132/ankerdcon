-- ── Event system refactor — Phase 1: new tables, additive only ─────────────
--
-- Introduces the real parent/child split: one `events` row per convention
-- trip (e.g. "DoKomi 2027") owning everything that's actually shared, and
-- one `event_days` row per day of that trip owning only what's genuinely
-- per-day (the date, whether there's a con happening that day, and RSVP).
--
-- This migration only ADDS tables — it does not touch `calendar`,
-- `hotel_rooms`, `meals`, `rides`, or `cosplays`, and nothing reads from
-- these new tables yet. Safe to run at any time; the live app is unaffected
-- until a later migration repoints the app at these tables.

CREATE TABLE events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_group_id        text,                 -- same series-label concept as calendar.event_group_id today; untouched
  event_name            text NOT NULL,
  is_hotel              boolean NOT NULL DEFAULT false,
  hotel_location        text,
  image_url             text,
  description           text,
  location              text,
  website               text,
  ticket_url            text,
  ticket_sale_start     text,
  ticket_types          jsonb,                -- [{title, price}]
  locker_info           text,
  parking_info          text,
  special_instructions  text,
  what_to_bring         text,
  reminders_sent        text[] NOT NULL DEFAULT '{}',
  ticket_reminders_sent text[] NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_days (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date         text NOT NULL,                 -- same DD-MM-YYYY / YYYY-MM-DD string convention as calendar.date today
  has_con      boolean NOT NULL DEFAULT true,  -- false = travel/hotel-only day, no convention happening
  participants text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, date)
);

CREATE INDEX idx_event_days_event_id ON event_days (event_id);
