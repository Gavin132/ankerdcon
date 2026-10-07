import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { TripSheet } from "./TripSheet";
import { Button } from "../common/Button";
import { CategoryPicker } from "../meal/CategoryPicker";
import { useCreateMeal, useMealCategories } from "../../hooks/useMeals";
import { defaultCategory } from "../../utils/mealCategory";
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
 * Anyone can plan an activity for the trip: a meal, bowling, the group photo.
 * The chosen soort decides what the form asks (a price, a car) and what the
 * page has afterwards (signing up). It's linked to the chosen day of the trip,
 * shows up in the Activiteiten tile straight away and (like one made in the
 * admin panel) notifies everyone subscribed to new activities.
 */
export function TripMealSheet({ open, onClose, trip }: TripMealSheetProps) {
  const createMutation = useCreateMeal();
  const { data: categories = [] } = useMealCategories();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dayId, setDayId] = useState(() => defaultDayId(trip));
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [cost, setCost] = useState("");
  const [transport, setTransport] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDayId(defaultDayId(trip));
    setTime("19:00");
    setLocation("");
    setMapsUrl("");
    setCost("");
    setTransport(false);
    setCategoryId(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Until someone picks one, the first soort (normally Eten) is selected.
  const category = categories.find((c) => c.id === categoryId) ?? defaultCategory(categories);
  const day = trip.days.find((d) => d.ev.id === dayId) ?? trip.days[0];
  const canSave = name.trim().length > 0 && time.length > 0;

  async function save() {
    if (!canSave) return;
    try {
      await createMutation.mutateAsync({
        meal_name: name.trim(),
        time: `${toDateKey(day.date)}T${time}`,
        location: location.trim() || undefined,
        maps_url: mapsUrl.trim() || undefined,
        cost: category.has_cost ? cost.trim() || undefined : undefined,
        transport_needed: category.has_transport && transport,
        linked_event_id: day.ev.id,
        category_id: category.id || undefined,
      });
      toast("success", `${name.trim()} toegevoegd`);
      onClose();
    } catch {
      toast("error", "Kon de activiteit niet toevoegen. Probeer opnieuw.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Activiteit toevoegen"
      subtitle={trip.title}
      footer={
        <Button onClick={save} loading={createMutation.isPending} disabled={!canSave} className="w-full">
          <CalendarPlus size={15} />
          Activiteit opslaan
        </Button>
      }
    >
      <div className="space-y-5">
        <CategoryPicker categories={categories} value={category.id} onChange={(c) => setCategoryId(c.id)} />

        <div>
          <label htmlFor="meal-name" className="section-label mb-2 block">{category.is_meal ? "Waar eten we?" : "Wat gaan we doen?"}</label>
          <input
            id="meal-name"
            className="input-field"
            placeholder={category.is_meal ? "Bijv. Pizza bij Luigi's" : "Bijv. Bowlen of Groepsfoto"}
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
            placeholder={category.is_meal ? "Adres of naam van het restaurant" : "Adres of naam van de plek"}
            maxLength={120}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="meal-maps-url" className="section-label mb-2 block">Google Maps-link (optioneel)</label>
          <input
            id="meal-maps-url"
            type="url"
            className="input-field"
            placeholder="https://maps.app.goo.gl/..."
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-ink-3">
            Opent direct de juiste plek vanaf de kaart, in plaats van dat iedereen er zelf naar moet zoeken. Vul ook
            een locatie hierboven in, anders krijgt deze activiteit geen pin.
          </p>
        </div>

        {category.has_cost && (
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
        )}

        {/* A real switch, so it reads as an on/off choice rather than an input. */}
        {category.has_transport && (
        <div className="flex items-center justify-between gap-4 rounded-xl border-1.5 border-line bg-surface px-3.5 py-3">
          <div className="min-w-0">
            <p id="meal-transport-label" className="text-[14px] font-semibold text-ink">Vervoer regelen</p>
            <p className="text-[12px] leading-snug text-ink-3">Er komt een rit naartoe waar mensen zich voor kunnen aanmelden.</p>
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
        )}
      </div>
    </TripSheet>
  );
}
