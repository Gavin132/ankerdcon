-- ============================================================
-- Ankerd Con — v1.4 migration
-- Run this in the Supabase SQL editor
-- ============================================================

-- profiles: admin flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- calendar: extended event fields
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS description        text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS location          text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS website           text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS ticket_url        text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS ticket_sale_start text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS locker_info       text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS parking_info      text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS special_instructions text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS what_to_bring     text;
ALTER TABLE calendar ADD COLUMN IF NOT EXISTS ticket_types      jsonb DEFAULT '[]'::jsonb;
