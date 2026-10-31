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
  /** Days that still need something get a small amber dot. */
  attention?: (dayId: string) => boolean;
}

/** Day filter for a multi-day trip — travel (hotel-only) days get a bed icon. */
export function DayChips({ days, value, onChange, allowAll = false, attention }: DayChipsProps) {
  const chip = (active: boolean) =>
    `chip ${active ? "chip-on" : "chip-off"}`;

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
          {attention?.(ev.id) && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn-fill" />}
        </button>
      ))}
    </div>
  );
}
