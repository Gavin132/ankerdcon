import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { useClaimShare } from "../../../hooks/useExpenses";
import { formatDate, formatDateTime, formatAmount } from "../../../utils/format";
import { toast } from "../../../store/toast.store";
import { routes } from "../../../config/routes";
import { KIND_CFG } from "../constants";
import { resolveUser, transposeGaps, urgencyTag } from "../helpers";
import { Facepile } from "./Facepile";
import type { AnyAction } from "../../../utils/actionItems";
import type { User } from "../../../types";

interface ActionCardProps {
  action: AnyAction;
  users: User[];
  expanded: boolean;
  onToggle: () => void;
  onOpenPaymentDrawer?: () => void;
}

export function ActionCard({
  action,
  users,
  expanded,
  onToggle,
  onOpenPaymentDrawer,
}: ActionCardProps) {
  const cfg      = KIND_CFG[action.kind];
  const claim    = useClaimShare();
  const navigate = useNavigate();

  // payment_confirm cards open the drawer directly — not collapsible inline
  if (action.kind === "payment_confirm") {
    const claimedCount = action.shares.filter((s) => s.status === "claimed").length;
    const pendingCount = action.shares.filter((s) => s.status === "pending").length;
    const totalAmt = action.shares.reduce((s, sh) => s + sh.amount, 0);
    const names = action.shares.map((s) => s.participant);

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
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {action.expense.description}
            </p>
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

  // ── Header for remaining kinds ────────────────────────────────────────────
  const header = (() => {
    if (action.kind === "event_gap") {
      return {
        title:   action.alert.eventName,
        subtitle: formatDate(action.alert.date),
        badge:   action.alert.missing.length,
        names:   action.alert.missing.map((m) => m.name),
        urgency: urgencyTag(action.alert.date),
        amount:  undefined,
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

  // ── Body ──────────────────────────────────────────────────────────────────
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
                {people.map((name) => {
                  const u = resolveUser(name, users);
                  return (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <UserAvatar
                        name={u?.name ?? name}
                        user={u}
                        className="h-3.5 w-3.5 text-[7px] !border-0"
                      />
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
            {action.gap.unassigned.map((name) => {
              const u = resolveUser(name, users);
              return (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                >
                  <UserAvatar
                    name={u?.name ?? name}
                    user={u}
                    className="h-3.5 w-3.5 text-[7px] !border-0"
                  />
                  {u?.name ?? name}
                </span>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => navigate(routes.transport)}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
          >
            <ArrowRight size={12} />
            Bekijk restaurant transport
          </button>
        </div>
      );
    }

    // payment_due
    return (
      <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
              Referentie
            </p>
            <p className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
              {action.share.payment_ref}
            </p>
          </div>
          <button
            onClick={async (e) => {
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
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {header.title}
            </p>
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
          <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
            {header.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {!expanded && <Facepile names={header.names} users={users} />}
          {header.badge !== null && header.badge !== undefined ? (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${cfg.pill}`}>
              {header.badge}
            </span>
          ) : (
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">
              {header.amount}
            </span>
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
