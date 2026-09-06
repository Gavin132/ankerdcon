-- ============================================================
-- Migration v2.19 — Retire the legacy `calendar` table
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================
--
-- The events/event_days parent-child model (v2.18) has fully replaced
-- `calendar` — every read/write in the app goes through events + event_days
-- now, and hotel_rooms/meals/rides/cosplays were already repointed from old
-- calendar ids to the new ones by repoint_fks_to_new_events.py.
--
-- The one dependency left was expenses.linked_event_id's foreign key
-- (added in v2.11, pointing at calendar(id)) — repointed below to
-- event_days(id), matching how "linked event" already means a single day
-- everywhere else in the app. expenses currently has no rows with
-- linked_event_id set, so there's no data to migrate, just the constraint.

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_linked_event_id_fkey;
ALTER TABLE expenses
  ADD CONSTRAINT expenses_linked_event_id_fkey
  FOREIGN KEY (linked_event_id) REFERENCES event_days(id) ON DELETE SET NULL;

DROP TABLE IF EXISTS calendar;
