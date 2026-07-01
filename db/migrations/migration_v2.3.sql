-- v2.3 — Add banner_position to profiles
-- Stores the CSS background-position for animated GIF banners
-- (static images are always center-cropped so this is only needed for GIFs)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS banner_position TEXT;
