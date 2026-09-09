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
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <Users size={12} className="shrink-0 text-sky-300" />
        <p className="text-xs text-white/60">
          <span className="font-bold text-white">{totalCount}</span>{" "}
          {totalCount === 1 ? "persoon gaat" : "mensen gaan"} mee, de meesten van {majorityRangeLabel}
        </p>
      </div>

      {exceptions.length > 0 && (
        <div className="mt-1.5 space-y-1 pl-5">
          {exceptions.map((exc, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-300/90">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
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
