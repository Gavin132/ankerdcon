import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, Plus, TrendingUp, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { UserAvatar } from "../components/common/UserAvatar";
import { ExpenseCard } from "../components/finance/ExpenseCard";
import { CreateExpenseDrawer } from "../components/finance/CreateExpenseDrawer";
import { ExpenseDetailDrawer } from "../components/finance/ExpenseDetailDrawer";
import { SettleUpCard, type SettleTarget } from "../components/finance/SettleUpCard";
import { SettlementDrawer } from "../components/finance/SettlementDrawer";
import { useSettleUp } from "../hooks/useSettlements";
import { useExpenses } from "../hooks/useExpenses";
import { useUsers } from "../hooks/useUsers";
import { useCurrentUser } from "../hooks/useUsers";
import { useCalendar } from "../hooks/useCalendar";
import { buildTrip, tripIdOf, type Trip } from "../utils/trips";
import { formatAmount, formatCurrency } from "../utils/format";
import { listContainer } from "../utils/motion";
import type { Expense, User } from "../types";

function resolveUser(name: string, users: User[]) {
  return users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
}

export function FinancePage() {
  const [createOpen, setCreateOpen]           = useState(false);
  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);
  // Hub › Voor jou links here with `?expense=<id>` to open that expense directly.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedExpenseId = searchParams.get("expense");
  // `?trip=<tripId>` limits everything below to one trip; `?trip=none` to unlinked expenses.
  const tripFilter = searchParams.get("trip");
  // `?settle=<id>` (from a Discord DM or the Hub) opens that settlement.
  const linkedSettlementId = searchParams.get("settle");
  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);

  const { data: allExpenses = [], isLoading } = useExpenses();
  const { data: events = [] } = useCalendar();

  // Trips that have at least one expense, newest trip first.
  const { tripOptions, tripOfExpense } = useMemo(() => {
    const tripOfExpense = new Map<string, Trip>();
    const trips = new Map<string, Trip>();
    for (const exp of allExpenses) {
      const ev = exp.linked_event_id ? events.find((e) => e.id === exp.linked_event_id) : undefined;
      if (!ev) continue;
      const id = tripIdOf(ev);
      const trip = trips.get(id) ?? buildTrip(events, id);
      if (!trip) continue;
      trips.set(id, trip);
      tripOfExpense.set(exp.id, trip);
    }
    const tripOptions = [...trips.values()].sort((a, b) => b.days[0].date.getTime() - a.days[0].date.getTime());
    return { tripOptions, tripOfExpense };
  }, [allExpenses, events]);

  const hasUnlinked = allExpenses.some((e) => !tripOfExpense.has(e.id));
  const selectedTrip = tripOptions.find((t) => t.id === tripFilter) ?? (tripFilter ? buildTrip(events, tripFilter) : null);
  const expenses = tripFilter === "none"
    ? allExpenses.filter((e) => !tripOfExpense.has(e.id))
    : selectedTrip
      ? allExpenses.filter((e) => tripOfExpense.get(e.id)?.id === selectedTrip.id)
      : allExpenses;

  function setTripFilter(next: string | null) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("trip", next);
    else params.delete("trip");
    setSearchParams(params, { replace: true });
  }
  const openExpenseId = detailExpenseId ?? linkedExpenseId;
  const detailExpense: Expense | null = allExpenses.find((e) => e.id === openExpenseId) ?? null;

  function openExpense(id: string) {
    setDetailExpenseId(id);
  }

  function closeExpense() {
    setDetailExpenseId(null);
    if (linkedExpenseId) {
      const params = new URLSearchParams(searchParams);
      params.delete("expense");
      setSearchParams(params, { replace: true });
    }
  }
  const { data: users    = [] }            = useUsers();
  const { data: me }                       = useCurrentUser();
  const { data: settleUp }                 = useSettleUp();

  const linkedSettlement = settleUp?.settlements.find((s) => s.id === linkedSettlementId);
  const openSettleTarget: SettleTarget | null =
    settleTarget ?? (linkedSettlement ? { kind: "settlement", settlement: linkedSettlement } : null);

  function closeSettlement() {
    setSettleTarget(null);
    if (linkedSettlementId) {
      const params = new URLSearchParams(searchParams);
      params.delete("settle");
      setSearchParams(params, { replace: true });
    }
  }

  const myName = me?.name;

  // ── Personal balance ─────────────────────────────────────────
  const { iOwe, othersOweMe } = useMemo(() => {
    let iOwe        = 0;
    let othersOweMe = 0;
    for (const exp of expenses) {
      for (const share of exp.shares) {
        if (share.status === "confirmed") continue;
        if (share.participant === myName) {
          iOwe += share.amount;
        } else if (exp.paid_by === myName) {
          othersOweMe += share.amount;
        }
      }
    }
    return { iOwe, othersOweMe };
  }, [expenses, myName]);

  const allSettled = iOwe < 0.01 && othersOweMe < 0.01;

  // ── Group summary ─────────────────────────────────────────────
  const { totalGroup, topSpenders } = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const exp of expenses) {
      totals[exp.paid_by] = (totals[exp.paid_by] ?? 0) + exp.amount;
    }
    const totalGroup  = Object.values(totals).reduce((s, n) => s + n, 0);
    const topSpenders = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { totalGroup, topSpenders };
  }, [expenses]);

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-sunken" />
        ))}
      </div>
    );
  }

  const net = othersOweMe - iOwe;
  const openTotal = iOwe + othersOweMe;
  const netTone = Math.abs(net) < 0.01
    ? "text-ink"
    : net > 0
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";

  return (
    <div className="space-y-5 pb-20 md:pb-0">

      {/* ── Trip filter ──────────────────────────────────────── */}
      <div className={`items-center gap-3 ${tripOptions.length > 0 || selectedTrip ? "flex" : "hidden"}`}>
        {(tripOptions.length > 0 || selectedTrip) && (
          <div
            role="group"
            aria-label="Filter op trip"
            className="-mx-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {[
              { id: null, label: "Alles" },
              ...(selectedTrip && !tripOptions.some((t) => t.id === selectedTrip.id) ? [selectedTrip] : []),
              ...tripOptions,
              ...(hasUnlinked ? [{ id: "none", label: "Zonder event" }] : []),
            ].map((opt) => {
              const id = opt.id;
              const label = "title" in opt ? opt.title : opt.label;
              const active = (tripFilter ?? null) === id || (!!selectedTrip && selectedTrip.id === id);
              return (
                <button
                  key={id ?? "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTripFilter(id)}
                  className={`shrink-0 whitespace-nowrap rounded-full border-1.5 px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    active
                      ? "border-ink bg-ink text-paper dark:border-brand dark:bg-brand dark:text-brand-on"
                      : "border-line bg-surface text-ink-2 hover:border-ink-3"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-5 xl:grid xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] xl:items-start xl:gap-[22px] xl:space-y-0">
        <div className="space-y-5">
          {/* ── Personal balance ─────────────────────────────── */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-surface overflow-hidden">
            <div className="flex items-center gap-2 px-4 pb-2 pt-4">
              <Wallet size={13} className="shrink-0 text-ink-3" />
              <p className="section-label truncate">
                {myName ? "Jouw saldo" : "Groepssaldo"}
                {selectedTrip ? ` · ${selectedTrip.title}` : tripFilter === "none" ? " · zonder event" : ""}
              </p>
            </div>

            {allSettled ? (
              <div className="flex items-center gap-3 px-4 pb-[18px] pt-1">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 size={20} />
                </span>
                <div>
                  <p className="font-display text-[24px] font-extrabold uppercase leading-none text-ink">Alles verrekend</p>
                  <p className="mt-1 text-[13px] text-ink-2">Geen openstaande bedragen</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 px-4 pb-[18px]">
                <p className={`font-mono text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${netTone}`}>
                  {formatAmount(Math.abs(net))}
                </p>
                <p className="text-[13px] text-ink-2">{net >= 0 ? "Te ontvangen" : "Te betalen"}</p>

                <div className="mt-2 flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-sunken" aria-hidden>
                  {othersOweMe > 0.01 && (
                    <div className="h-full bg-emerald-500" style={{ width: `${(othersOweMe / openTotal) * 100}%` }} />
                  )}
                  {iOwe > 0.01 && (
                    <div className="h-full bg-rose-500" style={{ width: `${(iOwe / openTotal) * 100}%` }} />
                  )}
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[12px] tabular-nums text-ink-2">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowDownLeft size={13} className="text-emerald-600 dark:text-emerald-400" />
                    Te ontvangen <b className="font-mono font-semibold text-ink">{formatAmount(othersOweMe)}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowUpRight size={13} className="text-rose-600 dark:text-rose-400" />
                    Te betalen <b className="font-mono font-semibold text-ink">{formatAmount(iOwe)}</b>
                  </span>
                </div>
              </div>
            )}
          </motion.section>

          {/* ── Settle up (across all trips) ─────────────────── */}
          <SettleUpCard overview={settleUp} users={users} meId={me?.id} onOpen={setSettleTarget} />

          {/* ── Group overview ───────────────────────────────── */}
          {expenses.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.08 } }}
              className="card-surface overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
                <p className="section-label flex items-center gap-1.5">
                  <TrendingUp size={13} />
                  Groep totaal
                </p>
                <span className="font-mono text-[15px] font-semibold tabular-nums text-ink">
                  {formatCurrency(totalGroup)}
                </span>
              </div>

              {/* Top spenders */}
              {topSpenders.length > 0 && (
                <ul className="px-2 pb-2">
                  {topSpenders.map(([name, amount]) => {
                    const pct = totalGroup > 0 ? (amount / totalGroup) * 100 : 0;
                    const u   = resolveUser(name, users);
                    return (
                      <li key={name} className="flex items-center gap-2.5 border-t border-line px-2 py-2">
                        <UserAvatar name={name} user={u} className="h-7 w-7 shrink-0 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13.5px] font-semibold text-ink">{name}</span>
                            <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink">{formatCurrency(amount)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken shadow-[inset_0_0_0_1px_rgb(var(--line))]">
                            <div
                              className="h-full rounded-full bg-ink-2 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.section>
          )}
        </div>

        {/* ── Expense list ─────────────────────────────────────── */}
        <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="section-label flex items-center gap-2">
            Uitgaven
            {expenses.length > 0 && <span className="font-mono text-[11px] tabular-nums text-ink-3">{expenses.length}</span>}
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            Uitgave toevoegen
          </Button>
        </div>
        {expenses.length === 0 ? (
          <div className="card-surface">
            <EmptyState
              icon={<Wallet size={22} />}
              title="Geen uitgaven"
              description={selectedTrip ? `Nog geen uitgaven voor ${selectedTrip.title}.` : "Voeg de eerste groepsuitgave toe."}
            />
          </div>
        ) : (
          <motion.div
            className="card-surface divide-y divide-line overflow-hidden"
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                users={users}
                me={myName}
                onClick={() => openExpense(expense.id)}
                tripTitle={selectedTrip ? undefined : tripOfExpense.get(expense.id)?.title}
              />
            ))}
          </motion.div>
        )}
        </div>
      </div>

      {/* ── Drawers ───────────────────────────────────────────── */}
      <CreateExpenseDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        me={myName}
        defaultEventId={selectedTrip?.days[0].ev.id}
      />
      <ExpenseDetailDrawer
        expense={detailExpense}
        onClose={closeExpense}
        users={users}
        me={myName}
      />
      <SettlementDrawer
        target={openSettleTarget}
        onClose={closeSettlement}
        users={users}
        meId={me?.id}
      />
    </div>
  );
}
