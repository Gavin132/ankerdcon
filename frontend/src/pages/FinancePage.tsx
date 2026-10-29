import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { UserAvatar } from "../components/common/UserAvatar";
import { ExpenseCard } from "../components/finance/ExpenseCard";
import { CreateExpenseDrawer } from "../components/finance/CreateExpenseDrawer";
import { ExpenseDetailDrawer } from "../components/finance/ExpenseDetailDrawer";
import { SettleUpCard, type SettleTarget } from "../components/finance/SettleUpCard";
import { SettlementDrawer } from "../components/finance/SettlementDrawer";
import { RideCostsCard } from "../components/finance/RideCostsCard";
import { useIsViewer } from "../hooks/useIsViewer";
import { useSettleUp } from "../hooks/useSettlements";
import { useExpenses } from "../hooks/useExpenses";
import { useMyNames, useUsers } from "../hooks/useUsers";
import { useCalendar } from "../hooks/useCalendar";
import { buildTrip, tripIdOf, type Trip } from "../utils/trips";
import { formatAmount } from "../utils/format";
import { paidPerPerson, personalBalance } from "../utils/finance";
import { listContainer } from "../utils/motion";
import type { Expense, User } from "../types";

function resolveUser(name: string, users: User[]) {
  return users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
}

export function FinancePage() {
  const viewer = useIsViewer();
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
  const { me, myNames }                    = useMyNames();
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
  // By any of the member's own names: after a rename their old expenses and shares still carry the old one.
  const { iOwe, othersOweMe } = useMemo(() => personalBalance(expenses, myNames), [expenses, myNames]);

  const allSettled = iOwe < 0.01 && othersOweMe < 0.01;

  // ── Group summary ─────────────────────────────────────────────
  const { totalGroup, topSpenders } = useMemo(() => {
    const perPerson = paidPerPerson(expenses, users);
    const totalGroup = perPerson.reduce((s, p) => s + p.amount, 0);
    const topSpenders = perPerson.slice(0, 3).map((p) => [p.name, p.amount] as const);
    return { totalGroup, topSpenders };
  }, [expenses, users]);

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-surface h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const net = othersOweMe - iOwe;
  const openTotal = iOwe + othersOweMe;
  const netTone = Math.abs(net) < 0.01
    ? "text-ink"
    : net > 0
      ? "text-ok"
      : "text-bad";

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
              ...(hasUnlinked ? [{ id: "none", label: "Zonder evenement" }] : []),
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
                  className={`chip ${active ? "chip-on" : "chip-off"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* On a phone everything is one column, ordered so the list of expenses (and its "add" button) comes right after
          what you owe, and the group's totals last; from xl the totals sit under the balance, the list beside them. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] xl:items-start xl:gap-[22px]">
        <div className="contents xl:block xl:space-y-5">
          {/* ── Personal balance ─────────────────────────────── */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-surface order-1 overflow-hidden xl:order-none">
            <div className="flex items-center gap-2 px-4 pb-2 pt-4">
              <Wallet size={14} className="shrink-0 text-ink-3" />
              <p className="section-label truncate">
                {myName ? "Jouw saldo" : "Groepssaldo"}
                {selectedTrip ? ` · ${selectedTrip.title}` : tripFilter === "none" ? " · zonder evenement" : ""}
              </p>
            </div>

            {allSettled ? (
              <div className="flex items-center gap-3 px-4 pb-[18px] pt-1">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg pill-ok">
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
                <p className="text-[13px] text-ink-2">{net >= 0 ? "Netto te ontvangen" : "Netto te betalen"}</p>

                <div className="mt-2 flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-sunken" aria-hidden>
                  {othersOweMe > 0.01 && (
                    <div className="h-full bg-ok-fill" style={{ width: `${(othersOweMe / openTotal) * 100}%` }} />
                  )}
                  {iOwe > 0.01 && (
                    <div className="h-full bg-bad-fill" style={{ width: `${(iOwe / openTotal) * 100}%` }} />
                  )}
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[12px] tabular-nums text-ink-2">
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowDownLeft size={14} className="text-ok" />
                    Te ontvangen <b className="font-mono font-semibold text-ink">{formatAmount(othersOweMe)}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowUpRight size={14} className="text-bad" />
                    Te betalen <b className="font-mono font-semibold text-ink">{formatAmount(iOwe)}</b>
                  </span>
                </div>
              </div>
            )}
          </motion.section>

          {/* ── Settle up (across all trips) ─────────────────── */}
          <SettleUpCard overview={settleUp} users={users} meId={me?.id} onOpen={setSettleTarget} className="order-2 xl:order-none" />

          {/* ── Ritkosten: what passengers owe the driver ────── */}
          <RideCostsCard tripFilter={tripFilter} className="order-3 xl:order-none" />

          {/* ── Group overview ───────────────────────────────── */}
          {expenses.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.08 } }}
              className="card-surface order-5 overflow-hidden xl:order-none"
            >
              <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
                <p className="section-label">Betaald per persoon</p>
                <span className="font-mono text-[15px] font-semibold tabular-nums text-ink">
                  {formatAmount(totalGroup)}
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
                        <UserAvatar name={name} user={u} className="h-7 w-7 shrink-0 text-[12px]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13.5px] font-semibold text-ink">{name}</span>
                            <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink">{formatAmount(amount)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken border border-line">
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
        <div className="order-4 space-y-3 xl:order-none">
        <div className="flex items-center justify-between gap-3">
          <p className="section-label flex items-center gap-2">
            Uitgaven
            {expenses.length > 0 && <span className="font-mono text-[12px] tabular-nums text-ink-3">{expenses.length}</span>}
          </p>
          {!viewer && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Uitgave toevoegen
            </Button>
          )}
        </div>
        {expenses.length === 0 ? (
          <div className="card-surface">
            <EmptyState
              icon={<Wallet size={22} />}
              title="Geen uitgaven"
              description={
                selectedTrip
                  ? `Nog geen uitgaven voor ${selectedTrip.title}.`
                  : viewer ? "Er zijn nog geen uitgaven." : "Voeg de eerste groepsuitgave toe."
              }
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
                myNames={myNames}
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
        myNames={myNames}
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
