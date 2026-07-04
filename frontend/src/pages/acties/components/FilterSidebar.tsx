import { motion } from "framer-motion";
import { KIND_CFG } from "../constants";
import type { ActionKind } from "../../../utils/actionItems";

export function FilterSidebar({
  byKind,
  total,
  filter,
  onFilter,
}: {
  byKind: Partial<Record<ActionKind, number>>;
  total: number;
  filter: ActionKind | "all";
  onFilter: (f: ActionKind | "all") => void;
}) {
  const entries = (Object.entries(byKind) as [ActionKind, number][]).filter(
    ([, n]) => n > 0,
  );
  if (entries.length <= 1) return null;

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Filter op categorie
        </p>
        <div className="space-y-1.5">
          <button
            onClick={() => onFilter("all")}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              filter === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
            }`}
          >
            <span>Alles</span>
            <span
              className={`text-xs font-black tabular-nums px-2 py-0.5 rounded-full ${
                filter === "all"
                  ? "bg-white/20 dark:bg-black/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              {total}
            </span>
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
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}
                >
                  {cfg.icon}
                </div>
                <span className="flex-1 text-left truncate">{cfg.label}</span>
                <span
                  className={`text-xs font-black tabular-nums px-2 py-0.5 rounded-full ${
                    active
                      ? cfg.pill
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>

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
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums w-4 text-right">
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
