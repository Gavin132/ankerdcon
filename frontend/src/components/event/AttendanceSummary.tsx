import { Users, AlertTriangle } from "lucide-react";
import { computeAttendanceSummary } from "../../utils/attendance";
import { dayShort } from "../../utils/multiDay";
import type { CalendarEvent } from "../../types";

interface Props {
  groupDays: { ev: CalendarEvent; date: Date }[];
}

export function AttendanceSummary({ groupDays }: Props) {
  const summary = computeAttendanceSummary(groupDays);
  if (!summary) return null;

  const { totalCount, majorityRangeLabel, exceptions } = summary;

  return (
    <div className="card-surface rounded-2xl px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10">
          <Users size={13} className="text-indigo-500" />
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span>{" "}
          {totalCount === 1 ? "persoon gaat" : "mensen gaan"} mee, de meesten van {majorityRangeLabel}
        </p>
      </div>

      {exceptions.length > 0 && (
        <div className="mt-3 space-y-1.5 pl-9">
          {exceptions.map((exc, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold">{exc.names.join(", ")}</span>
                {" — "}
                {exc.attendingDates.length === 0
                  ? "niet aanwezig"
                  : `alleen ${exc.attendingDates.map((d) => dayShort(d)).join("-")}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
