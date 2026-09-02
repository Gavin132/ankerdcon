-- ============================================================
-- Migration v2.12 — Changelog
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================

CREATE TABLE IF NOT EXISTS changelog_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  items       TEXT[]      NOT NULL DEFAULT '{}',
  released_at DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.changelog_entries TO service_role;

-- Seed entry for this update.
INSERT INTO changelog_entries (title, released_at, items) VALUES (
  'Snellere ritten, gastgebruikers en meer admin-controle',
  CURRENT_DATE,
  ARRAY[
    'Snel een rit naar/van het hotel aanbieden of zoeken, direct vanaf het hoofdscherm',
    'Hetzelfde voor ritten naar een restaurant — inclusief automatisch een chauffeur worden',
    'De chauffeur telt nu altijd mee als één van de plekken in de auto (dus 1/5 in plaats van 0/5)',
    'Standaard aantal plekken in elk ritformulier staat nu op 5',
    'Ritkaarten in het Transport-scherm zijn nu in hun geheel klikbaar voor meer details',
    'Maaltijdpagina toont nu ook direct wie er rijdt, zonder naar de ritpagina te hoeven gaan',
    'Notificatie-voorkeuren zijn toegevoegd aan het onboarding-proces voor nieuwe leden',
    'Nieuw: tijdreis-testtool voor beheerders om tijdsafhankelijke functies te testen',
    'Nieuw: beheerders kunnen inloggen als een andere gebruiker (bijv. iemand zonder eigen account)',
    'Beheerders kunnen nu betaalstatussen aanpassen, betalingen verwijderen en koppelen aan een evenement',
    'Duidelijker gemaakt hoe je iemand zonder Discord-account (een "gast") kunt toevoegen',
    'Een restaurantrit koppelen aan een etentje overschrijft niet meer je ingevulde tijd/locatie — het koppelt alleen',
    'De bestemming van een restaurantrit toont nu het adres van het etentje in plaats van het woord "Bestemming"'
  ]
);
