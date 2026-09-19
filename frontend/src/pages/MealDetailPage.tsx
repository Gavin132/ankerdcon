import { useState } from "react";
import { useParams } from "react-router-dom";
import { Car, UserCheck, UserMinus, UtensilsCrossed } from "lucide-react";
import { useMeals, useRsvpMeal, useCancelRsvp } from "../hooks/useMeals";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useUsers, useActingPermissions } from "../hooks/useUsers";
import { useSmartBack } from "../hooks/useSmartBack";
import { toast } from "../store/toast.store";
import { routes } from "../config/routes";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LinkedEventCard } from "../components/detail/LinkedEventCard";
import { MealHero } from "../components/meal/MealHero";
import { MealLinks } from "../components/meal/MealLinks";
import { MealPractical } from "../components/meal/MealPractical";
import { RestaurantDetailActions } from "../components/ride/RestaurantDetailActions";
import { RestaurantQuickDriverModal } from "../components/transport/RestaurantQuickDriverModal";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { NamePicker } from "../components/common/NamePicker";

export function MealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const goBack = useSmartBack(routes.currentTrip.tab("overview"));
  const [quickRideOpen, setQuickRideOpen] = useState(false);

  const { data: meals = [], isLoading } = useMeals();
  const { data: events = [] } = useCalendar();
  const { data: rides = [] } = useRides();
  const { data: users = [] } = useUsers();
  const { actable } = useActingPermissions();

  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);
  const [cancelNames, setCancelNames] = useState<string[]>([]);
  const rsvpMutation = useRsvpMeal();
  const cancelMutation = useCancelRsvp();

  const meal = meals.find((m) => m.id === id);
  const linkedEvent = meal?.linked_event_id
    ? events.find((e) => e.id === meal.linked_event_id)
    : undefined;
  const restaurantRide = meal
    ? rides.find((r) => r.direction === "Restaurant" && r.linked_meal_id === meal.id)
    : undefined;

  const userNames = users.map((u) => u.name);
  const participants = meal?.participants ?? [];

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: meal?.meal_name, url });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("success", "Link gekopieerd!");
    } catch {
      toast("error", "Kon de link niet kopiëren.");
    }
  }

  async function onRsvp() {
    if (!meal || rsvpNames.length === 0) return;
    try {
      for (const name of rsvpNames) {
        await rsvpMutation.mutateAsync({ id: meal.id, payload: { user_name: name } });
      }
      setRsvpNames([]);
      setRsvpOpen(false);
      toast(
        "success",
        rsvpNames.length === 1
          ? `${rsvpNames[0]} is aangemeld!`
          : `${rsvpNames.length} personen aangemeld!`,
      );
    } catch {
      toast("error", "Kon je niet aanmelden. Probeer opnieuw.");
    }
  }

  async function onCancel() {
    if (!meal || cancelNames.length === 0) return;
    try {
      for (const name of cancelNames) {
        await cancelMutation.mutateAsync({ id: meal.id, payload: { user_name: name } });
      }
      setCancelNames([]);
      setCancelOpen(false);
      toast(
        "success",
        cancelNames.length === 1
          ? `${cancelNames[0]} afgemeld.`
          : `${cancelNames.length} personen afgemeld.`,
      );
    } catch {
      toast("error", "Kon aanmelding niet annuleren.");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <DetailTopbar title="Laden…" onBack={goBack} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
          <UtensilsCrossed size={22} />
        </span>
        <p className="text-sm font-semibold text-ink">Maaltijd niet gevonden</p>
        <button onClick={goBack} className="text-xs font-semibold text-brand-text hover:underline">
          Terug
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <DetailTopbar title={meal.meal_name} onBack={goBack} onShare={onShare} />

      {(() => {
        const hasSidePanel = !!linkedEvent;
        return (
          <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 pt-4 sm:pt-6">
            <MealHero
              meal={meal}
              linkedEvent={linkedEvent}
              users={users}
              onRsvpClick={() => setRsvpOpen(true)}
              onCancelClick={() => setCancelOpen(true)}
            />

            {/* ── Transport for this meal — leads the page, same as the ride
                  detail page's own car list. ─────────────────────────────── */}
            {restaurantRide ? (
              <RestaurantDetailActions ride={restaurantRide} userNames={userNames} users={users} linkedMeal={meal} />
            ) : (
              meal.transport_needed && linkedEvent && (
                <button
                  type="button"
                  onClick={() => setQuickRideOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-[12px] border-1.5 border-dashed border-rose-400 bg-rose-50 px-4 py-6 text-sm font-semibold text-rose-700 transition-colors hover:border-rose-500 dark:border-rose-400/60 dark:bg-rose-500/10 dark:text-rose-300"
                >
                  <Car size={16} />
                  Nog geen rit georganiseerd — bied een auto aan
                </button>
              )
            )}

            <div className="space-y-4">
              <MealPractical meal={meal} />
              <MealLinks website={meal.website} menuUrl={meal.menu_url} />
              {hasSidePanel && (
                <LinkedEventCard event={linkedEvent!} />
              )}
            </div>
          </div>
        );
      })()}

      {linkedEvent && (
        <RestaurantQuickDriverModal
          open={quickRideOpen}
          onClose={() => setQuickRideOpen(false)}
          event={linkedEvent}
          meal={meal}
          existingRide={restaurantRide}
        />
      )}

      {/* Aanmelden modal */}
      <Modal
        open={rsvpOpen}
        onClose={() => { setRsvpOpen(false); setRsvpNames([]); }}
        title={`Aanmelden — ${meal.meal_name}`}
        description={meal.location || undefined}
        accent="from-emerald-500"
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={actable(userNames.filter((n) => !participants.includes(n)))}
            value={rsvpNames}
            onChange={setRsvpNames}
            color="green"
          />
          <Button
            onClick={onRsvp}
            loading={rsvpMutation.isPending}
            className="w-full"
            disabled={rsvpNames.length === 0}
          >
            <UserCheck size={15} />
            {rsvpNames.length === 0
              ? "Selecteer een naam"
              : rsvpNames.length === 1
                ? `${rsvpNames[0]} aanmelden`
                : `${rsvpNames.length} personen aanmelden`}
          </Button>
        </div>
      </Modal>

      {/* Afmelden modal */}
      <Modal
        open={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelNames([]); }}
        title="Aanmelding annuleren"
        description={meal.meal_name}
        accent="from-rose-500"
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={actable(participants)}
            value={cancelNames}
            onChange={setCancelNames}
            color="rose"
          />
          <Button
            variant="danger"
            onClick={onCancel}
            loading={cancelMutation.isPending}
            className="w-full"
            disabled={cancelNames.length === 0}
          >
            <UserMinus size={15} />
            {cancelNames.length === 0
              ? "Selecteer een naam"
              : cancelNames.length === 1
                ? `${cancelNames[0]} afmelden`
                : `${cancelNames.length} personen afmelden`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
