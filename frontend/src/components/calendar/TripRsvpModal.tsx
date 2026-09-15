import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { dayShort, monthShort } from "../../utils/multiDay";
import type { Trip } from "../../utils/trips";
import type { User } from "../../types";

interface TripRsvpModalProps {
  trip: Trip | null;
  users: User[];
  onClose: () => void;
  onConfirm: (mode: "join" | "leave", names: string[], eventIds: string[]) => void;
}

/**
 * Sign anyone up for (or off) a trip from the Agenda ticket — the ticket's own
 * button only covers yourself. For a multi-day trip you pick the days too;
 * all days are ticked to start with.
 */
export function TripRsvpModal({ trip: openTrip, users, onClose, onConfirm }: TripRsvpModalProps) {
  // Keep showing the last trip while the modal animates out.
  const lastTrip = useRef<Trip | null>(null);
  if (openTrip) lastTrip.current = openTrip;
  const trip = openTrip ?? lastTrip.current;
  const [mode, setMode] = useState<"join" | "leave">("join");
  const [names, setNames] = useState<string[]>([]);
  const [dayIds, setDayIds] = useState<string[]>([]);

  const openId = openTrip?.id ?? null;
  useEffect(() => {
    if (!lastTrip.current || openId === null) return;
    setMode("join");
    setNames([]);
    setDayIds(lastTrip.current.eventIds);
  }, [openId]);

  const days = trip?.days.filter((d) => dayIds.includes(d.ev.id)) ?? [];
  const options = mode === "join"
    ? users.map((u) => u.name)
    : [...new Set(days.flatMap((d) => d.ev.participants))];
  const multiDay = (trip?.days.length ?? 0) > 1;

  function toggleDay(id: string) {
    setDayIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const count = names.length;
  const dayText = multiDay ? (dayIds.length === trip!.days.length ? " voor alle dagen" : ` voor ${dayIds.length} ${dayIds.length === 1 ? "dag" : "dagen"}`) : "";
  const label = count === 0
    ? "Kies wie"
    : `${count} ${count === 1 ? "persoon" : "personen"} ${mode === "join" ? "aanmelden" : "afmelden"}${dayText}`;

  return (
    <Modal
      open={openTrip !== null}
      onClose={onClose}
      title={mode === "join" ? "Wie gaat er mee?" : "Wie gaat er niet mee?"}
      description={trip ? `${trip.title} · ${trip.dateRange}` : undefined}
      accent={mode === "leave" ? "from-rose-500" : undefined}
    >
      {trip && (
        <div className="space-y-4">
          <div className="flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]" role="group" aria-label="Aan- of afmelden">
            {(["join", "leave"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setNames([]); }}
                aria-pressed={mode === m}
                className={`flex-1 rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  mode === m ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]" : "text-ink-2 hover:text-ink"
                }`}
              >
                {m === "join" ? "Aanmelden" : "Afmelden"}
              </button>
            ))}
          </div>

          {multiDay && (
            <div>
              <p className="section-label mb-2">Dagen</p>
              <div className="grid grid-cols-3 gap-2">
                {trip.days.map(({ ev, date }) => {
                  const on = dayIds.includes(ev.id);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => toggleDay(ev.id)}
                      aria-pressed={on}
                      className={`relative rounded-[10px] px-1.5 py-2 text-center transition-colors ${
                        on ? "border-2 border-outline bg-surface" : "border-1.5 border-line bg-surface text-ink-3 hover:border-ink-3"
                      }`}
                    >
                      {on && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-1.5 border-outline bg-brand text-brand-on">
                          <Check size={9} strokeWidth={3} />
                        </span>
                      )}
                      <span className="block font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-ink-3">
                        {dayShort(date)} {monthShort(date)}
                      </span>
                      <span className={`block font-display text-[24px] font-extrabold leading-none ${on ? "text-ink" : "text-ink-3"}`}>
                        {date.getDate()}
                      </span>
                      <span className="mt-1 block truncate text-[11px] leading-none text-ink-2">
                        {ev.has_con === false ? "Reisdag" : `${ev.participants.length} mee`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="section-label mb-2">Namen</p>
            {mode === "leave" && options.length === 0 ? (
              <p className="text-[13px] text-ink-3">Er is nog niemand aangemeld voor {multiDay ? "deze dagen" : "dit event"}.</p>
            ) : (
              <NamePicker
                multiple
                options={options}
                value={names}
                onChange={setNames}
                color={mode === "leave" ? "rose" : "sky"}
              />
            )}
          </div>

          <Button
            variant={mode === "leave" ? "danger" : "primary"}
            disabled={count === 0 || dayIds.length === 0}
            className="w-full"
            onClick={() => { onConfirm(mode, names, dayIds); onClose(); }}
          >
            <Check size={15} />
            {label}
          </Button>
        </div>
      )}
    </Modal>
  );
}
