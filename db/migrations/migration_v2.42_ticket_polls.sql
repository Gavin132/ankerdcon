-- ============================================================
-- Migration v2.42 — Ticket vote ("Kaartverkoop")
-- ============================================================
-- Run in Supabase SQL Editor (or psql), BEFORE the deploy: until it has run, the
-- ticket vote on the event page answers 503; nothing else is affected.
-- ============================================================
--
-- An admin opens a vote on a trip with the ticket options (Za + Zo, Vr + Za + Zo ...), members pick one,
-- and an admin closes it by saying who bought the tickets. After that the page shows only the buyer
-- and the chosen option; the votes stay in the table. See app/routers/ticket_polls.py.
--
-- `event_id` is the real parent event (one vote per trip), like hotel_rooms.event_id. The options are
-- jsonb ([{id, label, price}]) with their own ids, because events.ticket_types has none.
--
-- People are stored by name, like everywhere else, so `voter` and `buyer` are part of the
-- placeholder merge (app/services/profile_merge.py).

CREATE TABLE IF NOT EXISTS ticket_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'bought')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  buyer text,
  chosen_option text,
  created_at timestamptz NOT NULL DEFAULT now(),
  bought_at timestamptz
);

-- `choice` is an option id from ticket_polls.options, or 'unsure'.
CREATE TABLE IF NOT EXISTS ticket_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES ticket_polls(id) ON DELETE CASCADE,
  voter text NOT NULL,
  choice text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, voter)
);

CREATE INDEX IF NOT EXISTS ticket_votes_poll_idx ON ticket_votes (poll_id);

ALTER TABLE ticket_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_votes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON ticket_polls TO service_role;
GRANT ALL ON ticket_votes TO service_role;
