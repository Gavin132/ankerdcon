-- ============================================================
-- Migration v2.27 — Drop the payment references
-- ============================================================
-- Run in Supabase SQL Editor (or psql), AFTER the app that no longer reads
-- them is deployed.
-- ============================================================
--
-- Every expense share got an "ANKERD-014"-style reference (v2.6) and every
-- settlement an "AFR-003" one (v2.25), meant as a transfer description.
-- Nothing ever used them: paying goes through a payment-request link or an
-- IBAN, and confirming is done in the app. The app no longer shows or sends
-- them, so the columns and their counters can go.

ALTER TABLE expense_shares DROP COLUMN IF EXISTS payment_ref;
ALTER TABLE settlements    DROP COLUMN IF EXISTS payment_ref;
DROP SEQUENCE IF EXISTS expense_share_ref_seq;
DROP SEQUENCE IF EXISTS settlement_ref_seq;
