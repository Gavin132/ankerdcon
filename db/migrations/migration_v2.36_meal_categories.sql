-- ============================================================
-- Migration v2.36 — Categories for meals ("Activiteiten")
-- ============================================================
-- Run in Supabase SQL Editor (or psql) BEFORE deploying the release that
-- adds them: creating or editing an activity writes `meals.category_id`, which
-- fails (503) until the column exists. Reading is unaffected, so it is safe to
-- run while the old release is still live.
-- ============================================================
--
-- A meal is now one kind of activity. `meal_categories` holds the kinds an admin
-- manages (Eten, Activiteit, Groepsfoto, Spel, Con, Concert, ...), and each one
-- says which parts of the form and page its items have:
--   has_signup    people can sign up ("Aanmelden")
--   has_cost      a price per person
--   has_transport a car can be arranged to it (Vervoer)
--   is_meal       counts as a meal: menu and dietary fields, and "nergens bij"
-- The table stays `meals`; only the app calls it Activiteiten.

CREATE TABLE IF NOT EXISTS meal_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  has_signup    BOOLEAN     NOT NULL DEFAULT TRUE,
  has_cost      BOOLEAN     NOT NULL DEFAULT TRUE,
  has_transport BOOLEAN     NOT NULL DEFAULT TRUE,
  is_meal       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_categories TO service_role;

INSERT INTO meal_categories (name, sort_order, has_signup, has_cost, has_transport, is_meal) VALUES
  ('Eten',       0, TRUE,  TRUE,  TRUE,  TRUE),
  ('Activiteit', 1, TRUE,  TRUE,  TRUE,  FALSE),
  ('Groepsfoto', 2, FALSE, FALSE, FALSE, FALSE),
  ('Spel',       3, TRUE,  FALSE, FALSE, FALSE),
  ('Con',        4, TRUE,  TRUE,  TRUE,  FALSE),
  ('Concert',    5, TRUE,  TRUE,  TRUE,  FALSE)
ON CONFLICT (name) DO NOTHING;

-- RESTRICT: a category that still has items cannot be deleted by accident.
ALTER TABLE meals ADD COLUMN IF NOT EXISTS category_id UUID
  REFERENCES meal_categories(id) ON DELETE RESTRICT;

-- Everything that exists today is a meal.
UPDATE meals
   SET category_id = (SELECT id FROM meal_categories WHERE name = 'Eten')
 WHERE category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_meals_category ON meals(category_id);
