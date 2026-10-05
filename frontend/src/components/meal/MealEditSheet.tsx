import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { useUpdateMeal } from "../../hooks/useMeals";
import { toast } from "../../store/toast.store";
import type { CalendarEvent, Meal } from "../../types";

interface MealEditSheetProps {
  open: boolean;
  onClose: () => void;
  meal: Meal;
  events: CalendarEvent[];
}

/**
 * Lets whoever created the meal — or an admin — fix it afterwards. Same
 * fields as "Etentje toevoegen" (TripMealSheet), plus which event it's
 * linked to; the more detailed practical fields (website, menu, dieet,
 * parkeren, notities) stay admin-only, edited from the admin panel.
 */
export function MealEditSheet({ open, onClose, meal, events }: MealEditSheetProps) {
  const updateMutation = useUpdateMeal();
  const [name, setName] = useState(meal.meal_name);
  const [time, setTime] = useState(meal.time);
  const [location, setLocation] = useState(meal.location);
  const [mapsUrl, setMapsUrl] = useState(meal.maps_url ?? "");
  const [cost, setCost] = useState(meal.cost ? String(meal.cost) : "");
  const [transport, setTransport] = useState(meal.transport_needed);
  const [linkedEventId, setLinkedEventId] = useState(meal.linked_event_id ?? "");

  useEffect(() => {
    if (!open) return;
    setName(meal.meal_name);
    setTime(meal.time);
    setLocation(meal.location);
    setMapsUrl(meal.maps_url ?? "");
    setCost(meal.cost ? String(meal.cost) : "");
    setTransport(meal.transport_needed);
    setLinkedEventId(meal.linked_event_id ?? "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSave = name.trim().length > 0 && time.length > 0;

  async function save() {
    if (!canSave) return;
    try {
      await updateMutation.mutateAsync({
        id: meal.id,
        payload: {
          meal_name: name.trim(),
          time,
          location: location.trim(),
          maps_url: mapsUrl.trim() || null,
          cost: cost.trim() ? Number(cost.replace(",", ".")) : 0,
          transport_needed: transport,
          linked_event_id: linkedEventId || null,
        },
      });
      toast("success", "Etentje bijgewerkt!");
      onClose();
    } catch {
      toast("error", "Kon het etentje niet opslaan. Probeer opnieuw.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Etentje bewerken"
      subtitle={meal.meal_name}
      footer={
        <Button onClick={save} loading={updateMutation.isPending} disabled={!canSave} className="w-full">
          <Save size={15} />
          Wijzigingen opslaan
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="meal-edit-name" className="section-label mb-2 block">Waar eten we?</label>
          <input
            id="meal-edit-name"
            className="input-field"
            placeholder="Bijv. Pizza bij Luigi's"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="meal-edit-time" className="section-label mb-2 block">Datum & tijd</label>
          <input
            id="meal-edit-time"
            type="datetime-local"
            className="input-field"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="meal-edit-location" className="section-label mb-2 block">Locatie (optioneel)</label>
          <input
            id="meal-edit-location"
            className="input-field"
            placeholder="Adres of naam van het restaurant"
            maxLength={120}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="meal-edit-maps-url" className="section-label mb-2 block">Google Maps-link (optioneel)</label>
          <input
            id="meal-edit-maps-url"
            type="url"
            className="input-field"
            placeholder="https://maps.app.goo.gl/..."
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="meal-edit-cost" className="section-label mb-2 block">Prijs p.p. (optioneel)</label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">€</span>
            <input
              id="meal-edit-cost"
              className="input-field pl-8"
              inputMode="decimal"
              placeholder="0,00"
              value={cost}
              onChange={(e) => setCost(e.target.value.replace(",", "."))}
            />
          </div>
        </div>

        <div>
          <label htmlFor="meal-edit-linked-event" className="section-label mb-2 block">Gekoppeld evenement (optioneel)</label>
          <select
            id="meal-edit-linked-event"
            className="input-field"
            value={linkedEventId}
            onChange={(e) => setLinkedEventId(e.target.value)}
          >
            <option value="">— Geen evenement —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.event_name} ({ev.date})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border-1.5 border-line bg-surface px-3.5 py-3">
          <div className="min-w-0">
            <p id="meal-edit-transport-label" className="text-[14px] font-semibold text-ink">Vervoer regelen</p>
            <p className="text-[12px] leading-snug text-ink-3">Er komt een rit naar het restaurant waar mensen zich voor kunnen aanmelden.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={transport}
            aria-labelledby="meal-edit-transport-label"
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
