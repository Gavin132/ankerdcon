import { useState } from "react";
import { useParams } from "react-router-dom";
import { Car, Pencil, UserCheck, UserMinus, UtensilsCrossed } from "lucide-react";
import { useMeals, useRsvpMeal, useCancelRsvp } from "../hooks/useMeals";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useUsers, useCurrentUser } from "../hooks/useUsers";
import { useSmartBack } from "../hooks/useSmartBack";
import { useIsViewer } from "../hooks/useIsViewer";
import { toast } from "../store/toast.store";
import { routes } from "../config/routes";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LinkedEventCard } from "../components/detail/LinkedEventCard";
import { MealHero } from "../components/meal/MealHero";
import { MealLinks } from "../components/meal/MealLinks";
import { MealPractical } from "../components/meal/MealPractical";
import { MealEditSheet } from "../components/meal/MealEditSheet";
import { RestaurantDetailActions } from "../components/ride/RestaurantDetailActions";
import { RestaurantQuickDriverModal } from "../components/transport/RestaurantQuickDriverModal";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { mealCategory } from "../utils/mealCategory";
import { NamePicker } from "../components/common/NamePicker";

export function MealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const goBack = useSmartBack(routes.currentTrip.tab("overview"));
  const [quickRideOpen, setQuickRideOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: meals = [], isLoading } = useMeals();
  const { data: events = [] } = useCalendar();
  const { data: rides = [] } = useRides();
  const { data: users = [] } = useUsers();
  const { data: me } = useCurrentUser();
  const viewer = useIsViewer();

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
  const canEdit = !!meal && !!me && (me.is_admin || meal.created_by === me.name);

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
      <div className="min-h-dvh bg-paper">
        <DetailTopbar title="Laden…" onBack={goBack} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-paper px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
          <UtensilsCrossed size={22} />
        </span>
        <p className="text-sm font-semibold text-ink">Activiteit niet gevonden</p>
        <button onClick={goBack} className="text-xs font-semibold text-brand-text hover:underline">
          Terug
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <DetailTopbar
        title="Activiteit"
        plainTitle
        onBack={goBack}
        onShare={onShare}
        actions={
          canEdit && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              title="Activiteit bewerken"
              aria-label="Activiteit bewerken"
              className="hit-area flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            >
              <Pencil size={16} />
            </button>
          )
        }
      />

      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 pt-5 sm:pt-8">
        <MealHero
          meal={meal}
          linkedEvent={linkedEvent}
          onRsvpClick={() => setRsvpOpen(true)}
          onCancelClick={() => setCancelOpen(true)}
        />

        {/* ── Transport for this meal — leads the page, same as the ride
              detail page's own car list. ─────────────────────────────── */}
        {restaurantRide ? (
          <RestaurantDetailActions ride={restaurantRide} userNames={userNames} users={users} linkedMeal={meal} />
        ) : (
          // A read-only member cannot offer a ride, so there is nothing to ask of them.
          mealCategory(meal).has_transport && meal.transport_needed && linkedEvent && !viewer && (
            <div className="card-surface flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Car size={18} />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-sm font-semibold text-ink">Nog geen rit</span>
                <span className="block text-xs text-ink-3">Bied een rit aan</span>
              </span>
              <button type="button" onClick={() => setQuickRideOpen(true)} className="btn-secondary px-4 text-sm">
                Ik rijd
              </button>
            </div>
          )
        )}

        <MealPractical meal={meal} />
        <MealLinks website={meal.website} menuUrl={meal.menu_url} />
        {linkedEvent && <LinkedEventCard event={linkedEvent} />}
      </div>

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
        title="Aanmelden"
        description={meal.meal_name}
        footer={
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
        }
      >
        <NamePicker
          multiple
          options={userNames.filter((n) => !participants.includes(n))}
          value={rsvpNames}
          onChange={setRsvpNames}
          color="sky"
        />
      </Modal>

      {/* Afmelden modal */}
      <Modal
        open={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelNames([]); }}
        title="Afmelden"
        description={meal.meal_name}
        footer={
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
        }
      >
        <NamePicker
          multiple
          options={participants}
          value={cancelNames}
          onChange={setCancelNames}
          color="rose"
        />
      </Modal>

      {canEdit && (
        <MealEditSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          meal={meal}
          events={events}
          onDeleted={goBack}
        />
      )}
    </div>
  );
}
