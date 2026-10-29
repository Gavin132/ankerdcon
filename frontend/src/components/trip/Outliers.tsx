import { dayShort, monthShort } from "../../utils/multiDay";
import type { TripDay, TripOutlier } from "../../utils/trips";

const dayLabel = (d: TripDay) => `${dayShort(d.date)} ${d.date.getDate()} ${monthShort(d.date)}`;

/** When someone is on a trip but not on all of its days: "vertrekt wo 18 nov", "komt do 19 nov", "alleen di, do". */
export function outlierText(o: TripOutlier): string {
  if (o.kind === "leaves-early") return `vertrekt ${dayLabel(o.days[o.days.length - 1])}`;
  if (o.kind === "arrives-late") return `komt ${dayLabel(o.days[0])}`;
  return `alleen ${o.days.map((d) => dayShort(d.date)).join(", ")}`;
}

/** One person in "who is not there all days": the name, and under it when they come or go. */
export function OutlierRow({ outlier }: { outlier: TripOutlier }) {
  return (
    <li className="text-sm leading-snug">
      <span className="break-words font-medium text-ink">{outlier.name}</span>
      <span className="block text-[13px] text-ink-3">{outlierText(outlier)}</span>
    </li>
  );
}
