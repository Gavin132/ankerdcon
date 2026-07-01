import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, TrendingUp, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { UserAvatar } from "../components/common/UserAvatar";
import { ExpenseCard } from "../components/finance/ExpenseCard";
import { CreateExpenseDrawer } from "../components/finance/CreateExpenseDrawer";
import { ExpenseDetailDrawer } from "../components/finance/ExpenseDetailDrawer";
import { useExpenses } from "../hooks/useExpenses";
import { useUsers } from "../hooks/useUsers";
import { useCurrentUser } from "../hooks/useUsers";
import { formatAmount, formatCurrency } from "../utils/format";
import { listContainer } from "../utils/motion";
import type { Expense, User } from "../types";

function resolveUser(name: string, users: User[]) {
  return users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
}

export function FinancePage() {
  const [createOpen, setCreateOpen]           = useState(false);
  const [detailExpense, setDetailExpense]     = useState<Expense | null>(null);

  const { data: expenses = [], isLoading } = useExpenses();
  const { data: users    = [] }            = useUsers();
  const { data: me }                       = useCurrentUser();

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
          <div key={i} className="card-surface rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Personal balance card ────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden rounded-3xl gradient-hero shadow-hero p-5">
          {/* Background blobs */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-sky-400/10" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/20">
                <Wallet size={16} className="text-sky-300" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-300">
                {myName ? `Jouw saldo` : "Groepssaldo"}
              </span>
            </div>

            {allSettled ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 size={28} className="text-emerald-400" />
                <div>
                  <p className="text-2xl font-black text-white">Alles verrekend</p>
                  <p className="text-xs text-sky-300 mt-0.5">Geen openstaande bedragen</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* I owe */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpRight size={13} className="text-rose-400" />
                    <span className="text-[11px] font-semibold text-sky-300/80">Te betalen</span>
                  </div>
                  <p className={`text-2xl font-black ${iOwe > 0.01 ? "text-white" : "text-white/40"}`}>
                    {formatAmount(iOwe)}
                  </p>
                </div>
                {/* Others owe me */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownLeft size={13} className="text-emerald-400" />
                    <span className="text-[11px] font-semibold text-sky-300/80">Te ontvangen</span>
                  </div>
                  <p className={`text-2xl font-black ${othersOweMe > 0.01 ? "text-white" : "text-white/40"}`}>
                    {formatAmount(othersOweMe)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Group overview card ──────────────────────────────── */}
      {expenses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.08 } }}>
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-violet-400 to-sky-400" />
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Groep totaal
                  </p>
                </div>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {formatCurrency(totalGroup)}
                </span>
              </div>

              {/* Top spenders */}
              {topSpenders.length > 0 && (
                <div className="space-y-1.5">
                  {topSpenders.map(([name, amount]) => {
                    const pct = totalGroup > 0 ? (amount / totalGroup) * 100 : 0;
                    const u   = resolveUser(name, users);
                    return (
                      <div key={name} className="flex items-center gap-2.5">
                        <UserAvatar name={name} user={u} className="h-5 w-5 text-[8px] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{name}</span>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 ml-2">{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Add expense button ───────────────────────────────── */}
      <Button className="w-full" onClick={() => setCreateOpen(true)}>
        <Plus size={16} />
        Uitgave toevoegen
      </Button>

      {/* ── Expense list ─────────────────────────────────────── */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={<Wallet size={36} />}
          title="Geen uitgaven"
          description="Voeg de eerste groepsuitgave toe."
        />
      ) : (
        <motion.div className="space-y-3" variants={listContainer} initial="hidden" animate="show">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              users={users}
              me={myName}
              onClick={() => setDetailExpense(expense)}
            />
          ))}
        </motion.div>
      )}

      {/* ── Drawers ───────────────────────────────────────────── */}
      <CreateExpenseDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        me={myName}
      />
      <ExpenseDetailDrawer
        expense={detailExpense}
        onClose={() => setDetailExpense(null)}
        users={users}
        me={myName}
      />
    </div>
  );
}
