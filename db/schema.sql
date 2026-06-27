-- ============================================================
-- Ankerd Con — complete database schema
-- Run this on a fresh Supabase project to set up all tables.
-- For an existing DB, use the incremental migration files in
-- db/migrations/ instead.
-- ============================================================


-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per user. Created automatically on first Discord OAuth login.

CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id           TEXT        UNIQUE,
  discord_username     TEXT,
  name                 TEXT        NOT NULL,
  avatar_url           TEXT,
  hotel_room           TEXT,
  phone_number         TEXT,
  pronouns             TEXT,
  bio                  TEXT,
  color                TEXT,
  banner_color         TEXT,
  banner_url           TEXT,
  banner_position      TEXT,
  font                 TEXT,
  live_location_ping   TEXT,
  aliases              TEXT[]      NOT NULL DEFAULT '{}',
  badge_ids            UUID[]      NOT NULL DEFAULT '{}',
  is_admin             BOOLEAN              DEFAULT false,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  is_first_login       BOOLEAN     NOT NULL DEFAULT true,
  allow_dm             BOOLEAN     NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN     NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ          DEFAULT now()
);


-- ── rides ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rides (
  id                 UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  direction          TEXT     NOT NULL,
  vehicle_type       TEXT     NOT NULL,
  driver             TEXT     NOT NULL,
  departure_time     TEXT     NOT NULL,
  start_location     TEXT     NOT NULL,
  total_seats        INTEGER  NOT NULL DEFAULT 0,
  passengers         TEXT[]   NOT NULL DEFAULT '{}',
  parking_info       TEXT,
  maps_link          TEXT,
  car_available      BOOLEAN  NOT NULL DEFAULT false,
  action_required    BOOLEAN  NOT NULL DEFAULT false,
  restaurant_drivers JSONB    NOT NULL DEFAULT '[]',
  linked_event_id    UUID     REFERENCES calendar(id) ON DELETE SET NULL
);


-- ── meals ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_name        TEXT        NOT NULL,
  time             TEXT        NOT NULL,
  location         TEXT        NOT NULL DEFAULT '',
  cost             NUMERIC     NOT NULL DEFAULT 0,
  transport_needed BOOLEAN     NOT NULL DEFAULT false,
  participants     TEXT[]      NOT NULL DEFAULT '{}',
  linked_event_id  UUID        REFERENCES calendar(id) ON DELETE SET NULL,
  website          TEXT,
  menu_url         TEXT,
  description      TEXT,
  dietary_options  TEXT,
  parking_info     TEXT,
  extra_notes      TEXT
);


-- ── payments ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_by     TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  date        TEXT        NOT NULL,
  splits      JSONB       NOT NULL DEFAULT '[]'
);


-- ── calendar ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name           TEXT        NOT NULL,
  date                 TEXT        NOT NULL,
  event_group_id       TEXT,
  is_hotel             BOOLEAN     NOT NULL DEFAULT false,
  participants         TEXT[]      NOT NULL DEFAULT '{}',
  reminders_sent       TEXT[]      NOT NULL DEFAULT '{}',
  description          TEXT,
  location             TEXT,
  website              TEXT,
  ticket_url           TEXT,
  ticket_sale_start    TEXT,
  locker_info          TEXT,
  parking_info         TEXT,
  special_instructions TEXT,
  what_to_bring        TEXT,
  ticket_types         JSONB                DEFAULT '[]',
  multi_day_id         TEXT
);


-- ── badges ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  image_url     TEXT        NOT NULL,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ── event_groups ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ── grants (service_role) ─────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rides        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_groups TO service_role;
