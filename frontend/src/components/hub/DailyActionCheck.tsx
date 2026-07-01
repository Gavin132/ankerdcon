import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Bus, UtensilsCrossed, Wallet } from "lucide-react";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import {
  actionCountByKind,
  actionTotalCount,
  type AnyAction,
} from "../../utils/actionItems";

interface Props {
  actions: AnyAction[];
}

const BREAKDOWN_DEFS = [
  { key: "event_gap" as const,      icon: <Bus size={10} />,             label: "event (transport)" },
  { key: "restaurant_gap" as const, icon: <UtensilsCrossed size={10} />, label: "restaurant" },
  {
    key: "payment" as const,
    icon: <Wallet size={10} />,
    label: "financiën",
    keys: ["payment_due", "payment_confirm"] as const,
  },
] as const;

export function DailyActionCheck({ actions }: Props) {
  const navigate = useNavigate();
  const total = actionTotalCount(actions);
  const byKind = actionCountByKind(actions);

  if (total === 0) return null;

  const breakdown = [
    byKind.event_gap
      ? { icon: BREAKDOWN_DEFS[0].icon, label: BREAKDOWN_DEFS[0].label, count: byKind.event_gap }
      : null,
    byKind.restaurant_gap
      ? { icon: BREAKDOWN_DEFS[1].icon, label: BREAKDOWN_DEFS[1].label, count: byKind.restaurant_gap }
      : null,
    (byKind.payment_due ?? 0) + (byKind.payment_confirm ?? 0) > 0
      ? {
          icon: BREAKDOWN_DEFS[2].icon,
          label: BREAKDOWN_DEFS[2].label,
          count: (byKind.payment_due ?? 0) + (byKind.payment_confirm ?? 0),
        }
      : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string; count: number }[];

  return (
    <motion.div variants={listItem}>
      <button
        type="button"
        onClick={() => navigate(routes.acties)}
        className="w-full text-left rounded-2xl bg-amber-50 dark:bg-amber-500/[0.07] border border-amber-200 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/35 hover:shadow-sm active:scale-[0.99] transition-all duration-150"
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/20">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {total === 1 ? "1 openstaande actie" : `${total} openstaande acties`}
            </p>
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0 mt-0.5">
              {breakdown.map((b, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400/70 font-medium"
                >
                  {b.icon}
                  {b.count} {b.label}
                </span>
              ))}
            </div>
          </div>

          <ArrowRight size={14} className="text-amber-500/60 dark:text-amber-400/40 shrink-0" />
        </div>
      </button>
    </motion.div>
  );
}
