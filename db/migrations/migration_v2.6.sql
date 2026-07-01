-- ============================================================
-- Migration v2.6 — Group expense tracking
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================

-- ── Payment reference sequence ───────────────────────────────
CREATE SEQUENCE IF NOT EXISTS expense_share_ref_seq START 1;

-- ── Expenses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    paid_by     TEXT         NOT NULL,
    amount      NUMERIC(10,2) NOT NULL,
    currency    TEXT         NOT NULL DEFAULT 'EUR',
    description TEXT         NOT NULL,
    date        DATE         NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT now()
);

-- ── Expense shares ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_shares (
    id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id   UUID         NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    participant  TEXT         NOT NULL,
    amount       NUMERIC(10,2) NOT NULL,
    payment_ref  TEXT         NOT NULL DEFAULT ('ANKERD-' || LPAD(nextval('expense_share_ref_seq')::TEXT, 3, '0')),
    status       TEXT         NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'claimed', 'confirmed')),
    claimed_at   TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  DEFAULT now()
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and write all expenses
CREATE POLICY "expenses_select" ON expenses       FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses       FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_delete" ON expenses       FOR DELETE TO authenticated USING (true);

CREATE POLICY "shares_select"   ON expense_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "shares_insert"   ON expense_shares FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shares_update"   ON expense_shares FOR UPDATE TO authenticated USING (true);
CREATE POLICY "shares_delete"   ON expense_shares FOR DELETE TO authenticated USING (true);

-- service_role bypass (used by the FastAPI backend)
GRANT ALL ON expenses       TO service_role;
GRANT ALL ON expense_shares TO service_role;
GRANT ALL ON expense_share_ref_seq TO service_role;
