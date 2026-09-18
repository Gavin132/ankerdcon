import { Check } from "lucide-react";
import { toDateKey, todayKey } from "../../utils/date";
import { dayShort, monthShort } from "../../utils/multiDay";
import type { Trip, TripDay } from "../../utils/trips";

interface TripDayPickerProps {
  trip: Trip;
  /** Every name the signed-in user can appear under in `participants`. */
  myNames: string[];
  /** Shows who went without offering to change it (a trip that's over). */
  readOnly?: boolean;
  onToggleDay: (day: TripDay) => void;
}

/**
 * "Welke dagen ga je?" — one box per day of a multi-day trip. Every upcoming
 * day carries a checkbox circle (empty, or filled once you're going) so it
 * reads as a toggle before you've ever tapped one; days that are over are the
 * only ones that fade.
 */
export function TripDayPicker({ trip, myNames, readOnly = false, onToggleDay }: TripDayPickerProps) {
  const today = todayKey();
  const isMine = (p: string) => myNames.includes(p);

  return (
    <div className="space-y-1.5 sm:max-w-[320px]">
      {!readOnly && <p className="text-[12.5px] font-semibold text-ink-2">Welke dagen ga je?</p>}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Jouw dagen">
        {trip.days.map((day) => {
          const { ev, date } = day;
          const isTravelDay = ev.has_con === false;
          const imGoing = ev.participants.some(isMine);
          const canToggle = !readOnly && toDateKey(date) >= today;
          const label = `${dayShort(date)} ${date.getDate()}`;

          const className = `relative min-w-0 rounded-[10px] border-1.5 px-1.5 pb-2 pt-3 text-center transition-[colors,transform] ${
            imGoing ? "border-brand-text bg-brand-soft" : `border-line ${isTravelDay ? "bg-hatch-surface" : "bg-surface"}`
          } ${canToggle ? "hover:border-ink-3 active:scale-[0.97]" : imGoing ? "" : "opacity-60"}`;

          const content = (
            <>
              {(canToggle || imGoing) && (
                <span
                  aria-hidden
                  className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-1.5 ${
                    imGoing ? "border-brand-text bg-brand text-brand-on" : "border-ink-3 bg-surface"
                  }`}
                >
                  {imGoing && <Check size={9} strokeWidth={3} />}
                </span>
              )}
              <span className="block font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-ink-3">
                {dayShort(date)} {monthShort(date)}
              </span>
              <span className="block font-display text-[26px] font-extrabold leading-none text-ink">{date.getDate()}</span>
              <span className="mt-1 block truncate text-[11.5px] leading-none text-ink-2">
                {isTravelDay ? "Reisdag" : `${ev.participants.length} mee`}
              </span>
            </>
          );

          return canToggle ? (
            <button
              key={ev.id}
              type="button"
              onClick={() => onToggleDay(day)}
              aria-pressed={imGoing}
              aria-label={`${label}: ${imGoing ? "je gaat mee, tik om je af te melden" : "tik om je aan te melden"}`}
              className={className}
            >
              {content}
            </button>
          ) : (
            <div key={ev.id} className={className} title={ev.event_name}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
