import { KIND_CFG } from "../constants";
import type { ActionKind } from "../../../utils/actionItems";

export function MobileFilterBar({
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

  const tabs = [
    { id: "all" as const, count: total, icon: null },
    ...entries.map(([kind, n]) => ({
      id: kind,
      count: n,
      icon: KIND_CFG[kind].icon,
    })),
  ];

  return (
    <div
      className="bg-slate-100 dark:bg-slate-900/80 rounded-2xl p-1 border border-slate-200/60 dark:border-slate-800 shadow-sm"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
      }}
    >
      {tabs.map((tab) => {
        const active = filter === tab.id;
        const barColor =
          tab.id !== "all" ? KIND_CFG[tab.id].barColor : "bg-slate-400";
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
            <div className="flex items-center justify-center h-[13px]">
              {tab.id === "all" ? (
                <div className="flex gap-[2px]">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-[9px] w-[2px] rounded-full ${active ? "bg-slate-700 dark:bg-slate-200" : "bg-slate-400 dark:bg-slate-500"}`}
                    />
                  ))}
                </div>
              ) : (
                tab.icon
              )}
            </div>
            <span
              className={`text-[11px] font-black tabular-nums leading-none ${
                active
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {tab.count}
            </span>
            {active && (
              <div
                className={`absolute bottom-1.5 h-0.5 w-4 rounded-full ${barColor}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
