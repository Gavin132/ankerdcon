-- ============================================================
-- Migration v2.24 — The payer's own share of an expense is settled
-- ============================================================
-- Run in Supabase SQL Editor (or psql)
-- ============================================================
--
-- An expense's amount is the whole bill, and the payer is usually one of the
-- people it's split between. Their own share used to start out as "pending",
-- so the app counted it as money they owed themselves. New expenses now save
-- that share as confirmed; this settles the ones created before.

UPDATE expense_shares s
   SET status       = 'confirmed',
       confirmed_at = COALESCE(s.confirmed_at, now())
  FROM expenses e
 WHERE s.expense_id  = e.id
   AND s.participant = e.paid_by
   AND s.status     <> 'confirmed';
