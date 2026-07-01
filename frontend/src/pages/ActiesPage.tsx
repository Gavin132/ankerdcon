import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bus, UtensilsCrossed, Wallet, CheckCircle2,
  ArrowUpRight, ArrowRight, CheckCheck, ChevronDown,
  ChevronLeft, ChevronRight, Users, CalendarDays,
} from "lucide-react";
import { Drawer } from "../components/common/Drawer";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { UserAvatar } from "../components/common/UserAvatar";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useMeals } from "../hooks/useMeals";
import { useExpenses, useClaimShare, useConfirmShare } from "../hooks/useExpenses";
import { useCurrentUser, useUsers } from "../hooks/useUsers";
import { formatDate, formatDateTime, formatAmount } from "../utils/format";
import { parseEventDate, todayKey, toDateKey } from "../utils/date";
import {
  computeAllActions, actionCountByKind, actionTotalCount,
  type AnyAction, type ActionKind,
} from "../utils/actionItems";
import { toast } from "../store/toast.store";
import type { Expense, ExpenseShare, User } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const KIND_CFG: Record<ActionKind, {
  bar: string; iconBg: string; icon: React.ReactNode; iconWhite: React.ReactNode;
  label: string; pill: string; barColor: string; heroColor: string;
}> = {
  event_gap: {
    bar:       "from-amber-400 to-orange-400",
    iconBg:    "bg-amber-100 dark:bg-amber-500/10",
    icon:      <Bus size={13} className="text-amber-600 dark:text-amber-400" />,
    iconWhite: <Bus size={11} className="text-white/70" />,
    label:     "Transport & Eten",
    pill:      "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    barColor:  "bg-amber-400",
    heroColor: "bg-amber-500/20 border-amber-400/25",
  },
  restaurant_gap: {
    bar:       "from-orange-400 to-rose-400",
    iconBg:    "bg-orange-100 dark:bg-orange-500/10",
    icon:      <UtensilsCrossed size={13} className="text-orange-600 dark:text-orange-400" />,
    iconWhite: <UtensilsCrossed size={11} className="text-white/70" />,
    label:     "Restaurant",
    pill:      "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
    barColor:  "bg-orange-400",
    heroColor: "bg-orange-500/20 border-orange-400/25",
  },
  payment_due: {
    bar:       "from-violet-400 to-purple-500",
    iconBg:    "bg-violet-100 dark:bg-violet-500/10",
    icon:      <ArrowUpRight size={13} className="text-violet-600 dark:text-violet-400" />,
    iconWhite: <ArrowUpRight size={11} className="text-white/70" />,
    label:     "Te betalen",
    pill:      "bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
    barColor:  "bg-violet-400",
    heroColor: "bg-violet-500/20 border-violet-400/25",
  },
  payment_confirm: {
    bar:       "from-emerald-400 to-teal-400",
    iconBg:    "bg-emerald-100 dark:bg-emerald-500/10",
    icon:      <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />,
    iconWhite: <CheckCircle2 size={11} className="text-white/70" />,
    label:     "Te bevestigen",
    pill:      "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    barColor:  "bg-emerald-400",
    heroColor: "bg-emerald-500/20 border-emerald-400/25",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveUser(name: string, users: User[]) {
  return users.find(u => u.name === name || u.discord_username === name || u.aliases?.includes(name));
}

function transposeGaps(missing: { name: string; items: string[] }[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const { name, items } of missing) {
    for (const item of items) {
      (map[item] ??= []).push(name);
    }
  }
  return map;
}

function getActionId(a: AnyAction): string {
  if (a.kind === "event_gap")      return `eg-${a.alert.eventName}-${a.alert.date}`;
  if (a.kind === "restaurant_gap") return `rg-${a.gap.id}`;
  if (a.kind === "payment_due")    return `pd-${a.share.id}`;
  return                                  `pc-${a.expense.id}`;
}

function urgencyTag(dateStr: string): "today" | "tomorrow" | null {
  const d = parseEventDate(dateStr);
  if (!d) return null;
  const key = toDateKey(d);
  const today = todayKey();
  if (key === today) return "today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === toDateKey(tomorrow)) return "tomorrow";
  return null;
}

// ── Facepile ──────────────────────────────────────────────────────────────────

function Facepile({ names, users, max = 5 }: { names: string[]; users: User[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map(n => {
        const u = resolveUser(n, users);
        return <UserAvatar key={n} name={u?.name ?? n} user={u} className="h-5 w-5 text-[7px] ring-[1.5px] ring-white dark:ring-slate-900" />;
      })}
      {extra > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 ring-[1.5px] ring-white dark:ring-slate-900 text-[8px] font-black text-slate-600 dark:text-slate-300">
          +{extra}
        </div>
      )}
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function ActiesHero({ total, byKind }: {
  total: number;
  byKind: Partial<Record<ActionKind, number>>;
}) {
  const entries = (Object.entries(byKind) as [ActionKind, number][]).filter(([, n]) => n > 0);

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 10% 30%, #92400e88 0%, transparent 55%),
            radial-gradient(ellipse at 90% 70%, #78350f66 0%, transparent 50%),
            linear-gradient(150deg, #1a0f00 0%, #261500 50%, #1f1200 100%)
          `,
        }}
      />
      {/* Grain */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.10] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="acties-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#acties-noise)" />
      </svg>
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      {/* Watermark */}
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
        <AlertTriangle size={190} strokeWidth={1} className="text-amber-400" />
      </div>
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 pt-6 pb-14">
        {/* Label + headline */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60 mb-1">
          Openstaande acties
        </p>
        <p className="text-[32px] font-black text-white leading-none mb-5">
          {total} {total === 1 ? "actie" : "acties"}
        </p>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {entries.map(([kind, n]) => {
            const cfg = KIND_CFG[kind];
            return (
              <div
                key={kind}
                className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white/80 ${cfg.heroColor}`}
              >
                {cfg.iconWhite}
                {n} {cfg.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Filter sidebar ────────────────────────────────────────────────────────────

function FilterSidebar({ byKind, total, filter, onFilter }: {
  byKind: Partial<Record<ActionKind, number>>;
  total: number;
  filter: ActionKind | "all";
  onFilter: (f: ActionKind | "all") => void;
}) {
  const entries = (Object.entries(byKind) as [ActionKind, number][]).filter(([, n]) => n > 0);
  if (entries.length <= 1) return null;

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Filter op categorie
        </p>
        <div className="space-y-1.5">
          {/* All */}
          <button
            onClick={() => onFilter("all")}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              filter === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
            }`}
          >
            <span>Alles</span>
            <span className={`text-xs font-black tabular-nums px-2 py-0.5 rounded-full ${
              filter === "all"
                ? "bg-white/20 dark:bg-black/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}>{total}</span>
          </button>
          {entries.map(([kind, n]) => {
            const cfg = KIND_CFG[kind];
            const active = filter === kind;
            return (
              <button
                key={kind}
                onClick={() => onFilter(kind)}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
                  {cfg.icon}
                </div>
                <span className="flex-1 text-left truncate">{cfg.label}</span>
                <span className={`text-xs font-black tabular-nums px-2 py-0.5 rounded-full ${
                  active
                    ? cfg.pill
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                }`}>{n}</span>
              </button>
            );
          })}
        </div>

        {/* Progress bars */}
        {total > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {entries.map(([kind, n]) => {
              const cfg = KIND_CFG[kind];
              return (
                <div key={kind} className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${cfg.barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(n / total) * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums w-4 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Payment confirm drawer ────────────────────────────────────────────────────

function PaymentConfirmDrawer({ open, onClose, expense, shares, users }: {
  open: boolean;
  onClose: () => void;
  expense: Expense | null;
  shares: ExpenseShare[];
  users: User[];
}) {
  const confirm = useConfirmShare();

  if (!expense) return null;

  const sorted = [...shares].sort((a, b) => {
    if (a.status === "claimed" && b.status !== "claimed") return -1;
    if (b.status === "claimed" && a.status !== "claimed") return 1;
    return a.participant.localeCompare(b.participant);
  });

  const claimedCount = shares.filter(s => s.status === "claimed").length;
  const pendingCount = shares.filter(s => s.status === "pending").length;
  const totalOutstanding = shares.reduce((s, sh) => s + sh.amount, 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={expense.description}
      subtitle={`${formatAmount(totalOutstanding, expense.currency)} openstaand · ${formatDate(expense.date)}`}
    >
      {/* Summary row */}
      <div className="flex gap-3 mb-5">
        {claimedCount > 0 && (
          <div className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2.5 text-center">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{claimedCount}</p>
            <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-wider mt-0.5">Te bevestigen</p>
          </div>
        )}
        {pendingCount > 0 && (
          <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-center">
            <p className="text-xl font-black text-slate-600 dark:text-slate-300">{pendingCount}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Afwachtend</p>
          </div>
        )}
      </div>

      {/* Share rows */}
      <div className="space-y-2">
        {sorted.map(share => {
          const u = resolveUser(share.participant, users);
          const isClaimed = share.status === "claimed";
          return (
            <div
              key={share.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                isClaimed
                  ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
                  : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <UserAvatar name={u?.name ?? share.participant} user={u} className="h-9 w-9 text-xs shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {u?.name ?? share.participant}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{share.payment_ref}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {formatAmount(share.amount, expense.currency)}
                  </p>
                  {isClaimed ? (
                    <span className="inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 rounded-full px-1.5 py-0.5">
                      Betaald
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">Afwachtend</span>
                  )}
                </div>
              </div>
              {isClaimed && (
                <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-500/20">
                  <button
                    onClick={async () => {
                      try {
                        await confirm.mutateAsync(share.id);
                        toast("success", `Betaling van ${u?.name ?? share.participant} bevestigd!`);
                      } catch {
                        toast("error", "Kon status niet bijwerken.");
                      }
                    }}
                    disabled={confirm.isPending}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white transition-colors"
                  >
                    <CheckCheck size={14} />
                    {confirm.isPending ? "Bezig…" : "Bevestig ontvangst"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}

// ── Collapsible action card ───────────────────────────────────────────────────

interface ActionCardProps {
  action: AnyAction;
  users: User[];
  expanded: boolean;
  onToggle: () => void;
  onOpenPaymentDrawer?: () => void;
}

function ActionCard({ action, users, expanded, onToggle, onOpenPaymentDrawer }: ActionCardProps) {
  const cfg   = KIND_CFG[action.kind];
  const claim = useClaimShare();

  // payment_confirm cards open the drawer directly — not collapsible inline
  if (action.kind === "payment_confirm") {
    const claimedCount = action.shares.filter(s => s.status === "claimed").length;
    const pendingCount = action.shares.filter(s => s.status === "pending").length;
    const totalAmt = action.shares.reduce((s, sh) => s + sh.amount, 0);
    const names = action.shares.map(s => s.participant);

    return (
      <button
        type="button"
        onClick={onOpenPaymentDrawer}
        className="w-full card-surface rounded-2xl overflow-hidden text-left hover:shadow-md transition-shadow"
      >
        <div className={`h-[3px] bg-gradient-to-r ${cfg.bar}`} />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
            {cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{action.expense.description}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
              {claimedCount > 0 && pendingCount > 0
                ? `${claimedCount} te bevestigen · ${pendingCount} afwachtend`
                : claimedCount > 0
                ? `${claimedCount} wacht${claimedCount === 1 ? "" : "en"} op bevestiging`
                : `${pendingCount} nog niet betaald`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Facepile names={names} users={users} max={4} />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">
              {formatAmount(totalAmt, action.expense.currency)}
            </span>
            <ArrowRight size={13} className="text-slate-300 dark:text-slate-600" />
          </div>
        </div>
      </button>
    );
  }

  // ── Header for remaining kinds ────────────────────────────────────
  const header = (() => {
    if (action.kind === "event_gap") {
      return {
        title:    action.alert.eventName,
        subtitle: formatDate(action.alert.date),
        badge:    action.alert.missing.length,
        names:    action.alert.missing.map(m => m.name),
        urgency:  urgencyTag(action.alert.date),
        amount:   undefined,
      };
    }
    if (action.kind === "restaurant_gap") {
      return {
        title:    action.gap.location,
        subtitle: formatDateTime(action.gap.departureTime),
        badge:    action.gap.unassigned.length,
        names:    action.gap.unassigned,
        urgency:  null as null,
        amount:   undefined,
      };
    }
    // payment_due
    return {
      title:    action.expense.description,
      subtitle: `Betaald door ${action.expense.paid_by}`,
      badge:    null,
      names:    [action.expense.paid_by],
      urgency:  null as null,
      amount:   formatAmount(action.share.amount, action.expense.currency),
    };
  })();

  // ── Body ──────────────────────────────────────────────────────────
  const body = (() => {
    if (action.kind === "event_gap") {
      const groups = transposeGaps(action.alert.missing);
      return (
        <div className="px-4 pb-4 pt-3 space-y-2.5 border-t border-slate-100 dark:border-slate-800">
          {Object.entries(groups).map(([gapType, people]) => (
            <div key={gapType} className="flex items-start gap-3">
              <span className="mt-0.5 w-10 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {gapType}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {people.map(name => {
                  const u = resolveUser(name, users);
                  return (
                    <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      <UserAvatar name={u?.name ?? name} user={u} className="h-3.5 w-3.5 text-[7px] !border-0" />
                      {u?.name ?? name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (action.kind === "restaurant_gap") {
      return (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {action.gap.unassigned.map(name => {
              const u = resolveUser(name, users);
              return (
                <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <UserAvatar name={u?.name ?? name} user={u} className="h-3.5 w-3.5 text-[7px] !border-0" />
                  {u?.name ?? name}
                </span>
              );
            })}
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <ArrowRight size={12} />
            Bekijk restaurant transport
          </p>
        </div>
      );
    }

    // payment_due
    return (
      <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Referentie</p>
            <p className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">{action.share.payment_ref}</p>
          </div>
          <button
            onClick={async e => {
              e.stopPropagation();
              try {
                await claim.mutateAsync(action.share.id);
                toast("success", "Betaling gemarkeerd als verzonden.");
              } catch {
                toast("error", "Kon status niet bijwerken.");
              }
            }}
            disabled={claim.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition-colors"
          >
            <Wallet size={12} />
            {claim.isPending ? "Bezig…" : "Ik heb betaald"}
          </button>
        </div>
      </div>
    );
  })();

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className={`h-[3px] bg-gradient-to-r ${cfg.bar}`} />
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{header.title}</p>
            {header.urgency === "today" && (
              <span className="shrink-0 rounded-full bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Vandaag
              </span>
            )}
            {header.urgency === "tomorrow" && (
              <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Morgen
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{header.subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {!expanded && <Facepile names={header.names} users={users} />}
          {header.badge !== null && header.badge !== undefined ? (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${cfg.pill}`}>
              {header.badge}
            </span>
          ) : (
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{header.amount}</span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} className="text-slate-400" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {body}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages = total <= 7 ? Array.from({ length: total }, (_, i) => i) : null;
  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-slate-400">Pagina {page + 1} van {total}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-white/[0.06] disabled:opacity-30 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {pages
          ? pages.map(i => (
              <button key={i} onClick={() => onChange(i)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                  i === page ? "bg-sky-500 text-white" : "text-slate-500 hover:bg-white dark:hover:bg-white/[0.06] border border-slate-200 dark:border-slate-700"
                }`}
              >
                {i + 1}
              </button>
            ))
          : <span className="text-xs text-slate-400 px-2">{page + 1} / {total}</span>
        }
        <button
          onClick={() => onChange(page + 1)} disabled={page === total - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-white/[0.06] disabled:opacity-30 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Mobile segmented filter ───────────────────────────────────────────────────

function MobileFilterBar({ byKind, total, filter, onFilter }: {
  byKind: Partial<Record<ActionKind, number>>;
  total: number;
  filter: ActionKind | "all";
  onFilter: (f: ActionKind | "all") => void;
}) {
  const entries = (Object.entries(byKind) as [ActionKind, number][]).filter(([, n]) => n > 0);
  if (entries.length <= 1) return null;

  const tabs = [
    { id: "all" as const, count: total, icon: null },
    ...entries.map(([kind, n]) => ({ id: kind, count: n, icon: KIND_CFG[kind].icon })),
  ];

  return (
    <div
      className="bg-slate-100 dark:bg-slate-900/80 rounded-2xl p-1 border border-slate-200/60 dark:border-slate-800 shadow-sm"
      style={{ display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map(tab => {
        const active = filter === tab.id;
        const barColor = tab.id !== "all" ? KIND_CFG[tab.id].barColor : "bg-slate-400";
        return (
          <button
            key={tab.id}
            onClick={() => onFilter(tab.id)}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 transition-all duration-150 ${
              active
                ? "bg-white dark:bg-slate-800 shadow-sm"
                : "hover:bg-white/50 dark:hover:bg-slate-800/40"
            }`}
          >
            {/* Icon or "All" glyph */}
            <div className="flex items-center justify-center h-[13px]">
              {tab.id === "all" ? (
                <div className="flex gap-[2px]">
                  {[0,1,2].map(i => (
                    <div key={i} className={`h-[9px] w-[2px] rounded-full ${active ? "bg-slate-700 dark:bg-slate-200" : "bg-slate-400 dark:bg-slate-500"}`} />
                  ))}
                </div>
              ) : tab.icon}
            </div>
            {/* Count */}
            <span className={`text-[11px] font-black tabular-nums leading-none ${
              active ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
            }`}>
              {tab.count}
            </span>
            {/* Active indicator bar */}
            {active && (
              <div className={`absolute bottom-1.5 h-0.5 w-4 rounded-full ${barColor}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ kind }: { kind: ActionKind }) {
  const cfg = KIND_CFG[kind];
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cfg.iconBg}`}>
        {cfg.icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {cfg.label}
      </p>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ActiesPage() {
  const navigate = useNavigate();
  const [filter, setFilter]       = useState<ActionKind | "all">("all");
  const [page, setPage]           = useState(0);
  const [expandedIds, setExpanded] = useState<Set<string>>(new Set());
  const [drawerExpense, setDrawerExpense] = useState<{ expense: Expense; shares: ExpenseShare[] } | null>(null);

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

  const byKind = useMemo(() => actionCountByKind(allActions), [allActions]);
  const total  = useMemo(() => actionTotalCount(allActions),  [allActions]);

  const filtered   = filter === "all" ? allActions : allActions.filter(a => a.kind === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => setPage(0), [filter]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const hasMultipleKinds = Object.values(byKind).filter(n => (n ?? 0) > 0).length > 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DetailTopbar title="Openstaande acties" onBack={() => navigate(-1)} />
      {/* Hero */}
      <ActiesHero total={total} byKind={byKind} />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-7">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Segmented filter (mobile only) */}
            <div className="lg:hidden">
              <MobileFilterBar byKind={byKind} total={total} filter={filter} onFilter={setFilter} />
            </div>

            {/* Empty state */}
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
          </div>

          {/* ── Sidebar (desktop only) ── */}
          <div className="hidden lg:block space-y-4">
            <FilterSidebar byKind={byKind} total={total} filter={filter} onFilter={setFilter} />

            {/* Stats card */}
            {total > 0 && (() => {
              const people = new Set<string>();
              const evts   = new Set<string>();
              for (const a of allActions) {
                if (a.kind === "event_gap") {
                  a.alert.missing.forEach(m => people.add(m.name));
                  evts.add(a.alert.eventName);
                }
                if (a.kind === "restaurant_gap") a.gap.unassigned.forEach(n => people.add(n));
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

      {/* Payment confirm drawer */}
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
