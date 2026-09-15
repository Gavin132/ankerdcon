import { BedDouble } from "lucide-react";
import { dayShort } from "../../utils/multiDay";
import type { TripDay } from "../../utils/trips";

interface DayChipsProps {
  days: TripDay[];
  /** Selected day id, or null for "Alle dagen". */
  value: string | null;
  onChange: (dayId: string | null) => void;
  /** Offer an "Alle dagen" chip. Off where a single day is required (Overzicht). */
  allowAll?: boolean;
}

/** Day filter for a multi-day trip — travel (hotel-only) days get a bed icon. */
export function DayChips({ days, value, onChange, allowAll = false }: DayChipsProps) {
  const chip = (active: boolean) =>
    `shrink-0 flex items-center gap-1.5 rounded-[10px] border-1.5 px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
      active
        ? "border-outline bg-ink text-paper dark:bg-brand dark:text-brand-on"
        : "border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
    }`;

  return (
    <div
      role="group"
      aria-label="Kies een dag"
      className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {allowAll && (
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={chip(value === null)}>
          Alle dagen
        </button>
      )}
      {days.map(({ ev, date }) => (
        <button
          key={ev.id}
          type="button"
          aria-pressed={value === ev.id}
          onClick={() => onChange(ev.id)}
          className={chip(value === ev.id)}
        >
          {ev.has_con === false && <BedDouble size={12} />}
          <span className="capitalize">{dayShort(date)}</span> <span className="font-mono tabular-nums">{date.getDate()}</span>
        </button>
      ))}
    </div>
  );
}
