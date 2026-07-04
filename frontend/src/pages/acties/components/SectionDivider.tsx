import { KIND_CFG } from "../constants";
import type { ActionKind } from "../../../utils/actionItems";

export function SectionDivider({ kind }: { kind: ActionKind }) {
  const cfg = KIND_CFG[kind];
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cfg.iconBg}`}
      >
        {cfg.icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {cfg.label}
      </p>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
