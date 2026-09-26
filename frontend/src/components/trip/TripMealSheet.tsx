import { useEffect, useState } from "react";
import { Utensils } from "lucide-react";
import { TripSheet } from "./TripSheet";
import { Button } from "../common/Button";
import { useCreateMeal } from "../../hooks/useMeals";
import { toast } from "../../store/toast.store";
import { toDateKey, todayKey } from "../../utils/date";
import { dayShort, monthShort } from "../../utils/multiDay";
import type { Trip } from "../../utils/trips";

interface TripMealSheetProps {
  open: boolean;
  onClose: () => void;
  trip: Trip;
}

/** The trip's next day that isn't over, else its last. */
function defaultDayId(trip: Trip): string {
  const today = todayKey();
  return (trip.days.find((d) => toDateKey(d.date) >= today) ?? trip.days[trip.days.length - 1]).ev.id;
}

/**
 * Anyone can plan a meal for the trip. It's linked to the chosen day of the
 * trip, shows up in the Eten tile straight away and (like one made in the
 * admin panel) notifies everyone subscribed to new meals.
 */
export function TripMealSheet({ open, onClose, trip }: TripMealSheetProps) {
  const createMutation = useCreateMeal();
  const [name, setName] = useState("");
  const [dayId, setDayId] = useState(() => defaultDayId(trip));
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("");
  const [transport, setTransport] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDayId(defaultDayId(trip));
    setTime("19:00");
    setLocation("");
    setCost("");
    setTransport(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const day = trip.days.find((d) => d.ev.id === dayId) ?? trip.days[0];
  const canSave = name.trim().length > 0 && time.length > 0;

  async function save() {
    if (!canSave) return;
    try {
      await createMutation.mutateAsync({
        meal_name: name.trim(),
        time: `${toDateKey(day.date)}T${time}`,
        location: location.trim() || undefined,
        cost: cost.trim() || undefined,
        transport_needed: transport,
        linked_event_id: day.ev.id,
      });
      toast("success", `${name.trim()} toegevoegd`);
      onClose();
    } catch {
      toast("error", "Kon het etentje niet toevoegen. Probeer opnieuw.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Etentje toevoegen"
      subtitle={trip.title}
      footer={
        <Button onClick={save} loading={createMutation.isPending} disabled={!canSave} className="w-full">
          <Utensils size={15} />
          Etentje opslaan
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="meal-name" className="section-label mb-2 block">Waar eten we?</label>
          <input
            id="meal-name"
            className="input-field"
            placeholder="Bijv. Pizza bij Luigi's"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div>
            <p className="section-label mb-2">Dag</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dag">
              {trip.days.map((d) => (
                <button
                  key={d.ev.id}
                  type="button"
                  onClick={() => setDayId(d.ev.id)}
                  aria-pressed={dayId === d.ev.id}
                  className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                    dayId === d.ev.id ? "border-2 border-outline bg-brand text-brand-on" : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"
                  }`}
                >
                  {dayShort(d.date)} {d.date.getDate()} {monthShort(d.date)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="meal-time" className="section-label mb-2 block">Tijd</label>
            <input id="meal-time" type="time" className="input-field w-[110px]" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div>
          <label htmlFor="meal-location" className="section-label mb-2 block">Locatie (optioneel)</label>
          <input
            id="meal-location"
            className="input-field"
            placeholder="Adres of naam van het restaurant"
            maxLength={120}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="meal-cost" className="section-label mb-2 block">Prijs p.p. (optioneel)</label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">€</span>
            <input
              id="meal-cost"
              className="input-field pl-8"
              inputMode="decimal"
              placeholder="0,00"
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(",", "."))}
            />
          </div>
        </div>

        {/* A real switch, so it reads as an on/off choice rather than an input. */}
        <div className="flex items-center justify-between gap-4 rounded-xl border-1.5 border-line bg-surface px-3.5 py-3">
          <div className="min-w-0">
            <p id="meal-transport-label" className="text-[14px] font-semibold text-ink">Vervoer regelen</p>
            <p className="text-[12px] leading-snug text-ink-3">Er komt een rit naar het restaurant waar mensen zich voor kunnen aanmelden.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={transport}
            aria-labelledby="meal-transport-label"
            onClick={() => setTransport((v) => !v)}
            className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-outline transition-colors duration-200 ${transport ? "bg-brand" : "bg-sunken"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-outline bg-surface transition-[left] duration-200 ${transport ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>
      </div>
    </TripSheet>
  );
}
