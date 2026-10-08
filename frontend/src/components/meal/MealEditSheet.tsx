import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { CategoryPicker } from "./CategoryPicker";
import { useDeleteMeal, useMealCategories, useUpdateMeal } from "../../hooks/useMeals";
import { mealCategory } from "../../utils/mealCategory";
import { toast } from "../../store/toast.store";
import type { CalendarEvent, Meal } from "../../types";

interface MealEditSheetProps {
  open: boolean;
  onClose: () => void;
  meal: Meal;
  events: CalendarEvent[];
  /** Called once the activity is gone, so the page showing it can leave. */
  onDeleted: () => void;
}

/**
 * Lets whoever created the activity — or an admin — fix it afterwards, or remove
 * it. Same
 * fields as "Activiteit toevoegen" (TripMealSheet), plus which event it's
 * linked to; the more detailed practical fields (website, menu, dieet,
 * parkeren, notities) stay admin-only, edited from the admin panel.
 */
export function MealEditSheet({ open, onClose, meal, events, onDeleted }: MealEditSheetProps) {
  const updateMutation = useUpdateMeal();
  const deleteMutation = useDeleteMeal();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: categories = [] } = useMealCategories();
  const [categoryId, setCategoryId] = useState<string | null>(meal.category_id ?? meal.category?.id ?? null);
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
    setCategoryId(meal.category_id ?? meal.category?.id ?? null);
    setConfirmDelete(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // What is on screen follows the soort picked now, falling back to the one it has.
  const category = categories.find((c) => c.id === categoryId) ?? mealCategory(meal);
  const canSave = name.trim().length > 0 && time.length > 0;

  async function remove() {
    try {
      await deleteMutation.mutateAsync(meal.id);
      toast("success", `${meal.meal_name} verwijderd.`);
      onClose();
      onDeleted();
    } catch {
      toast("error", "Kon de activiteit niet verwijderen. Probeer opnieuw.");
    }
  }

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
          cost: category.has_cost && cost.trim() ? Number(cost.replace(",", ".")) : 0,
          transport_needed: category.has_transport && transport,
          linked_event_id: linkedEventId || null,
          category_id: category.id || undefined,
        },
      });
      toast("success", "Activiteit bijgewerkt!");
      onClose();
    } catch {
      toast("error", "Kon de activiteit niet opslaan. Probeer opnieuw.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Activiteit bewerken"
      subtitle={meal.meal_name}
      footer={
        <Button onClick={save} loading={updateMutation.isPending} disabled={!canSave} className="w-full">
          <Save size={15} />
          Wijzigingen opslaan
        </Button>
      }
    >
      <div className="space-y-5">
        <CategoryPicker categories={categories} value={category.id} onChange={(c) => setCategoryId(c.id)} />

        <div>
          <label htmlFor="meal-edit-name" className="section-label mb-2 block">{category.is_meal ? "Waar eten we?" : "Wat gaan we doen?"}</label>
          <input
            id="meal-edit-name"
            className="input-field"
            placeholder={category.is_meal ? "Bijv. Pizza bij Luigi's" : "Bijv. Bowlen of Groepsfoto"}
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
            placeholder={category.is_meal ? "Adres of naam van het restaurant" : "Adres of naam van de plek"}
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

        {category.has_cost && (
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
        )}

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

        {category.has_transport && (
        <div className="flex items-center justify-between gap-4 rounded-xl border-1.5 border-line bg-surface px-3.5 py-3">
          <div className="min-w-0">
            <p id="meal-edit-transport-label" className="text-[14px] font-semibold text-ink">Vervoer regelen</p>
            <p className="text-[12px] leading-snug text-ink-3">Er komt een rit naartoe waar mensen zich voor kunnen aanmelden.</p>
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
        )}

        {/* Removing is a different thing from saving, so it sits apart and asks first. */}
        <div className="border-t-1.5 border-line pt-5">
          {confirmDelete ? (
            <div className="space-y-3 rounded-xl border-1.5 border-rose-300 bg-rose-50 p-3.5 dark:border-rose-400/40 dark:bg-rose-500/10">
              <p className="text-[13px] leading-snug text-rose-800 dark:text-rose-200">
                <b>{meal.meal_name}</b> verwijderen?
                {meal.participants.length > 0 &&
                  ` ${meal.participants.length} ${meal.participants.length === 1 ? "aanmelding gaat" : "aanmeldingen gaan"} mee.`}
                {meal.transport_needed && " De rit ernaartoe wordt ook verwijderd."} Dit kan niet ongedaan worden.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={remove} loading={deleteMutation.isPending} className="flex-1">
                  <Trash2 size={15} />
                  Ja, verwijderen
                </Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleteMutation.isPending} className="flex-1">
                  Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-[13px] font-semibold text-rose-700 transition-colors hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200"
            >
              <Trash2 size={14} />
              Activiteit verwijderen
            </button>
          )}
        </div>
      </div>
    </TripSheet>
  );
}
