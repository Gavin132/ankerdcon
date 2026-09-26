import { Check } from "lucide-react";
import { dayShort, monthShort } from "../../utils/multiDay";
import type { TripDay } from "../../utils/trips";

interface SelectableDayCardsProps {
  days: TripDay[];
  /** Ids (the day's event id) that are currently picked. */
  selected: string[];
  onToggle: (dayId: string) => void;
  /** The small line under the number, e.g. "3 cosplays". Defaults to the day's name. */
  caption?: (day: TripDay) => string;
  label?: string;
}

/**
 * Pick days for a form or a filter, as the same little cards the event ticket
 * uses for signing up: weekday and month, the date big, a check circle that
 * fills in when the day is picked. A choice of days should look like the days
 * the person already knows.
 */
export function SelectableDayCards({ days, selected, onToggle, caption, label = "Kies dagen" }: SelectableDayCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={label}>
      {days.map((day) => {
        const { ev, date } = day;
        const on = selected.includes(ev.id);
        const travel = ev.has_con === false;
        return (
          <button
            key={ev.id}
            type="button"
            onClick={() => onToggle(ev.id)}
            aria-pressed={on}
            aria-label={`${dayShort(date)} ${date.getDate()}: ${on ? "gekozen" : "niet gekozen"}`}
            className={`relative min-w-0 rounded-[10px] border-1.5 px-1.5 pb-2 pt-3 text-center transition-[colors,transform] hover:border-ink-3 active:scale-[0.97] ${
              on ? "border-brand-text bg-brand-soft" : `border-line ${travel ? "bg-hatch-surface" : "bg-surface"}`
            }`}
          >
            <span
              aria-hidden
              className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-1.5 ${
                on ? "border-brand-text bg-brand text-brand-on" : "border-ink-3 bg-surface"
              }`}
            >
              {on && <Check size={9} strokeWidth={3} />}
            </span>
            <span className="block font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-ink-3">
              {dayShort(date)} {monthShort(date)}
            </span>
            <span className="block font-display text-[26px] font-extrabold leading-none text-ink">{date.getDate()}</span>
            <span className="mt-1 block truncate text-[11.5px] leading-none text-ink-2">
              {caption ? caption(day) : travel ? "Reisdag" : ev.event_name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
