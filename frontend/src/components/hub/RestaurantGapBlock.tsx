import { UtensilsCrossed, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RestaurantGap } from "../../types";
import { avatarColor } from "../../utils/avatar";
import { formatDateTime } from "../../utils/format";
import { CollapsibleSection } from "../common/CollapsibleSection";

export function RestaurantGapBlock({ gap }: { gap: RestaurantGap }) {
  const navigate = useNavigate();
  return (
    <CollapsibleSection
      defaultOpen={false}
      className="border-b border-slate-100 dark:border-slate-800 last:border-0"
      titleClassName="py-2.5 px-4"
      title={
        <div className="flex items-center gap-2 min-w-0">
          <UtensilsCrossed size={12} className="shrink-0 text-amber-500" />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
            {gap.location}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            {formatDateTime(gap.departureTime)}
          </span>
          <span className="ml-auto mr-2 shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-100 px-1.5 text-xs font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
            {gap.unassigned.length}
          </span>
        </div>
      }
    >
      <div className="px-4 pb-3 space-y-2">
        <p className="text-xs text-slate-400">Nog geen rit toegewezen:</p>
        {gap.unassigned.map((name) => (
          <div key={name} className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${avatarColor(name)}`}
            >
              {name[0].toUpperCase()}
            </div>
            <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {name}
            </span>
          </div>
        ))}
        <button
          onClick={() =>
            navigate("/transport", { state: { tab: "Restaurant" } })
          }
          className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors dark:text-amber-400"
        >
          <ArrowRight size={12} />
          Bekijk restaurant transport
        </button>
      </div>
    </CollapsibleSection>
  );
}
