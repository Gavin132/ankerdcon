import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useMeals } from "../hooks/useMeals";
import { useExpenses } from "../hooks/useExpenses";
import { useCurrentUser, useUsers } from "../hooks/useUsers";
import {
  computeAllActions,
  actionCountByKind,
  actionTotalCount,
  type ActionKind,
  type AnyAction,
} from "../utils/actionItems";
import { firstUpcomingEvents } from "../utils/multiDay";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { useSmartBack } from "../hooks/useSmartBack";
import { routes } from "../config/routes";
import { PAGE_SIZE } from "./acties/constants";
import { getActionId } from "./acties/helpers";
import { ActiesHero } from "./acties/components/ActiesHero";
import { ActionCard } from "./acties/components/ActionCard";
import { FilterSidebar } from "./acties/components/FilterSidebar";
import { MobileFilterBar } from "./acties/components/MobileFilterBar";
import { SectionDivider } from "./acties/components/SectionDivider";
import { Pagination } from "./acties/components/Pagination";
import { PaymentConfirmDrawer } from "./acties/components/PaymentConfirmDrawer";
import { CheckCheck, Users, CalendarDays, CalendarClock, ChevronDown } from "lucide-react";
import type { Expense, ExpenseShare } from "../types";

export function ActiesPage() {
  const goBack = useSmartBack(routes.hub);
  const [filter, setFilter]       = useState<ActionKind | "all">("all");
  const [page, setPage]           = useState(0);
  const [expandedIds, setExpanded] = useState<Set<string>>(new Set());
  const [futureOpen, setFutureOpen] = useState(false);
  const [drawerExpense, setDrawerExpense] = useState<{
    expense: Expense;
    shares: ExpenseShare[];
  } | null>(null);

  const { data: events   = [] } = useCalendar();
  const { data: rides    = [] } = useRides();
  const { data: meals    = [] } = useMeals();
  const { data: expenses = [] } = useExpenses();
  const { data: users    = [] } = useUsers();
  const { data: me }            = useCurrentUser();

  const allActions = useMemo(
    () => computeAllActions({ events, rides, meals, expenses, myName: me?.name }),
    [events, rides, meals, expenses, me?.name],
  );

  // Transport/food gaps only nag for whichever event is happening first — later
  // events' gaps move into the collapsed "Toekomstige evenementen" section below,
  // mirroring how past events collapse under Geschiedenis elsewhere in the app.
  // Restaurant and payment actions aren't tied to a specific event, so those
  // always stay in the current list.
  const firstEventKeys = useMemo(() => {
    const evs = firstUpcomingEvents(events);
    return new Set(evs.map((ev) => `${ev.event_name}|${ev.date}`));
  }, [events]);

  const isCurrent = (a: AnyAction) =>
    a.kind !== "event_gap" || firstEventKeys.has(`${a.alert.eventName}|${a.alert.date}`);

  const currentActions = useMemo(() => allActions.filter(isCurrent), [allActions, firstEventKeys]);
  const futureActions  = useMemo(() => allActions.filter((a) => !isCurrent(a)), [allActions, firstEventKeys]);

  const byKind = useMemo(() => actionCountByKind(currentActions), [currentActions]);
  const total  = useMemo(() => actionTotalCount(currentActions),  [currentActions]);

  const filtered   = filter === "all" ? currentActions : currentActions.filter((a) => a.kind === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => setPage(0), [filter]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DetailTopbar title="Openstaande acties" onBack={goBack} />
      <ActiesHero total={total} byKind={byKind} />

      <div className="max-w-4xl mx-auto px-4 py-7">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="lg:hidden">
              <MobileFilterBar byKind={byKind} total={total} filter={filter} onFilter={setFilter} />
            </div>

            {paged.length === 0 ? (
              <div className="card-surface rounded-2xl overflow-hidden">
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/10">
                    <CheckCheck size={22} className="text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {filter === "all" ? "Geen openstaande acties" : "Geen acties in deze categorie"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Alles is up-to-date</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {paged.map((action, i) => {
                  const id         = getActionId(action);
                  const isExpanded = expandedIds.has(id);
                  const prevAction = i > 0 ? paged[i - 1] : null;
                  const showDivider = filter === "all" && (prevAction === null || action.kind !== prevAction.kind);
                  return (
                    <div key={id}>
                      {showDivider && <SectionDivider kind={action.kind} />}
                      <ActionCard
                        action={action}
                        users={users}
                        expanded={isExpanded}
                        onToggle={() => toggleExpand(id)}
                        onOpenPaymentDrawer={
                          action.kind === "payment_confirm"
                            ? () => setDrawerExpense({ expense: action.expense, shares: action.shares })
                            : undefined
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <Pagination page={page} total={totalPages} onChange={setPage} />

            {/* ── Future events (collapsed) ── */}
            {futureActions.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setFutureOpen((o) => !o)}
                  className="flex w-full items-center justify-between mb-3 group"
                >
                  <p className="section-label flex items-center gap-2">
                    <CalendarClock size={13} className="text-slate-400" />
                    Toekomstige evenementen ({futureActions.length})
                  </p>
                  <motion.div
                    animate={{ rotate: futureOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-slate-400 group-hover:text-slate-600 transition-colors"
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {futureOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3">
                        {futureActions.map((action) => {
                          const id         = getActionId(action);
                          const isExpanded = expandedIds.has(id);
                          return (
                            <ActionCard
                              key={id}
                              action={action}
                              users={users}
                              expanded={isExpanded}
                              onToggle={() => toggleExpand(id)}
                            />
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Sidebar (desktop only) ── */}
          <div className="hidden lg:block space-y-4">
            <FilterSidebar byKind={byKind} total={total} filter={filter} onFilter={setFilter} />

            {total > 0 && (() => {
              const people = new Set<string>();
              const evts   = new Set<string>();
              for (const a of currentActions) {
                if (a.kind === "event_gap") {
                  a.alert.missing.forEach((m) => people.add(m.name));
                  evts.add(a.alert.eventName);
                }
                if (a.kind === "restaurant_gap") a.gap.unassigned.forEach((n) => people.add(n));
              }
              if (people.size === 0 && evts.size === 0) return null;
              return (
                <div className="card-surface rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Betrokkenen
                  </p>
                  {people.size > 0 && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Users size={13} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{people.size}</p>
                        <p className="text-[10px] text-slate-400">{people.size === 1 ? "persoon" : "personen"}</p>
                      </div>
                    </div>
                  )}
                  {evts.size > 0 && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <CalendarDays size={13} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{evts.size}</p>
                        <p className="text-[10px] text-slate-400">{evts.size === 1 ? "evenement" : "evenementen"}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      <PaymentConfirmDrawer
        open={drawerExpense !== null}
        onClose={() => setDrawerExpense(null)}
        expense={drawerExpense?.expense ?? null}
        shares={drawerExpense?.shares ?? []}
        users={users}
      />
    </div>
  );
}
