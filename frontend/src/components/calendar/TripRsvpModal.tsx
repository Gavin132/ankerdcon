import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { Segmented } from "../common/Segmented";
import { SelectableDayCards } from "../trip/SelectableDayCards";
import type { Trip } from "../../utils/trips";
import { groupPeople } from "../../utils/people";
import type { User } from "../../types";

interface TripRsvpModalProps {
  trip: Trip | null;
  users: User[];
  onClose: () => void;
  onConfirm: (mode: "join" | "leave", names: string[], eventIds: string[]) => void;
}

/**
 * Sign anyone up for (or off) a trip, as a bottom sheet — the day boxes on the
 * ticket only cover yourself. For a multi-day trip you pick the days too; all
 * days are ticked to start with.
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
    <TripSheet
      open={openTrip !== null}
      onClose={onClose}
      title={mode === "join" ? "Wie gaat er mee?" : "Wie gaat er niet mee?"}
      subtitle={trip ? `${trip.title} · ${trip.dateRange}` : undefined}
      footer={
        <Button
          variant={mode === "leave" ? "danger" : "primary"}
          disabled={count === 0 || dayIds.length === 0}
          className="w-full"
          onClick={() => { onConfirm(mode, names, dayIds); onClose(); }}
        >
          <Check size={15} />
          {label}
        </Button>
      }
    >
      {trip && (
        <div className="space-y-4">
          <Segmented
            label="Aan- of afmelden"
            fill
            options={[{ value: "join", label: "Aanmelden" }, { value: "leave", label: "Afmelden" }]}
            value={mode}
            onChange={(m) => { setMode(m); setNames([]); }}
          />

          {multiDay && (
            <div>
              <p className="section-label mb-2">Dagen</p>
              <SelectableDayCards
                days={trip.days}
                selected={dayIds}
                onToggle={toggleDay}
                caption={({ ev }) => (ev.has_con === false ? "Reisdag" : `${groupPeople(ev.participants ?? [], users).length} mee`)}
                label="Dagen"
              />
            </div>
          )}

          <div>
            <p className="section-label mb-2">Namen</p>
            {mode === "leave" && options.length === 0 ? (
              <p className="text-[13px] text-ink-3">Er is nog niemand aangemeld voor {multiDay ? "deze dagen" : "dit evenement"}.</p>
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
        </div>
      )}
    </TripSheet>
  );
}
