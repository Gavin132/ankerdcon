-- ============================================================
-- Migration v2.25 — Settling up between members
-- ============================================================
-- Run in Supabase SQL Editor (or psql), after v2.24.
-- ============================================================
--
-- Instead of paying back every expense share on its own, two members settle
-- everything open between them with one payment: a settlement. It covers the
-- shares it was worked out from (expense_shares.settlement_id) and settles
-- them once the receiver confirms the money arrived.
--
-- Members are stored by profile id, so a rename never splits someone's
-- balance in two. How to pay (a bank's payment-request link, or an IBAN) is
-- kept on the settlement only while it's open, and cleared on confirmation —
-- it's never stored on a profile.

CREATE SEQUENCE IF NOT EXISTS settlement_ref_seq START 1;

CREATE TABLE IF NOT EXISTS settlements (
    id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id  UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id    UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount        NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    currency      TEXT          NOT NULL DEFAULT 'EUR',
    status        TEXT          NOT NULL DEFAULT 'requested'
                                CHECK (status IN ('requested', 'claimed', 'confirmed')),
    payment_ref   TEXT          NOT NULL DEFAULT ('AFR-' || LPAD(nextval('settlement_ref_seq')::TEXT, 3, '0')),
    request_url   TEXT,
    iban          TEXT,
    account_name  TEXT,
    created_by    UUID          REFERENCES profiles(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ   DEFAULT now(),
    claimed_at    TIMESTAMPTZ,
    confirmed_at  TIMESTAMPTZ,
    CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS settlements_from_user_idx ON settlements (from_user_id);
CREATE INDEX IF NOT EXISTS settlements_to_user_idx   ON settlements (to_user_id);

ALTER TABLE expense_shares
  ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expense_shares_settlement_idx ON expense_shares (settlement_id);

-- Only the backend (service role) touches this table, like every other one
-- since v2.22: RLS on, no policies for anon/authenticated.
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
GRANT ALL ON settlements              TO service_role;
GRANT ALL ON SEQUENCE settlement_ref_seq TO service_role;
