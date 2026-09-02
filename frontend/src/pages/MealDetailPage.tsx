import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Car, UtensilsCrossed } from "lucide-react";
import { useMeals } from "../hooks/useMeals";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useUsers } from "../hooks/useUsers";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LinkedEventCard } from "../components/detail/LinkedEventCard";
import { MealHero } from "../components/meal/MealHero";
import { MealLinks } from "../components/meal/MealLinks";
import { MealPractical } from "../components/meal/MealPractical";
import { MealRsvpSection } from "../components/meal/MealRsvpSection";
import { RestaurantDetailActions } from "../components/ride/RestaurantDetailActions";
import { RestaurantQuickDriverModal } from "../components/transport/RestaurantQuickDriverModal";

export function MealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quickRideOpen, setQuickRideOpen] = useState(false);

  const { data: meals = [], isLoading } = useMeals();
  const { data: events = [] } = useCalendar();
  const { data: rides = [] } = useRides();
  const { data: users = [] } = useUsers();

  const meal = meals.find((m) => m.id === id);
  const linkedEvent = meal?.linked_event_id
    ? events.find((e) => e.id === meal.linked_event_id)
    : undefined;
  const restaurantRide = meal
    ? rides.find((r) => r.direction === "Restaurant" && r.linked_meal_id === meal.id)
    : undefined;

  const userNames = users.map((u) => u.name);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DetailTopbar title="Laden…" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <UtensilsCrossed size={40} className="opacity-30" />
        <p className="text-sm">Maaltijd niet gevonden</p>
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">
          Terug
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DetailTopbar title={meal.meal_name} onBack={() => navigate(-1)} />
      <MealHero meal={meal} linkedEvent={linkedEvent} users={users} />

      {(() => {
        const hasSidePanel = !!(meal.website || meal.menu_url || meal.location?.trim() || meal.transport_needed || meal.parking_info || meal.dietary_options || meal.extra_notes);
        return (
          <div className="max-w-4xl mx-auto px-4 py-7 space-y-5">
            <div className={`grid gap-5 items-start ${hasSidePanel ? "grid-cols-1 lg:grid-cols-3" : ""}`}>
              <div className={`${hasSidePanel ? "lg:col-span-2" : ""} space-y-5`}>
                <MealRsvpSection meal={meal} userNames={userNames} users={users} />
                {linkedEvent && <LinkedEventCard event={linkedEvent} />}
              </div>
              {hasSidePanel && (
                <div className="space-y-4">
                  <MealLinks website={meal.website} menuUrl={meal.menu_url} />
                  <MealPractical meal={meal} />
                </div>
              )}
            </div>

            {/* ── Transport for this meal ─────────────────────────────────── */}
            {restaurantRide ? (
              <RestaurantDetailActions ride={restaurantRide} userNames={userNames} users={users} linkedMeal={meal} />
            ) : (
              meal.transport_needed && linkedEvent && (
                <button
                  type="button"
                  onClick={() => setQuickRideOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-6 text-sm font-semibold text-slate-400 hover:border-amber-400 hover:text-amber-500 dark:hover:border-amber-500 dark:hover:text-amber-400 transition-colors"
                >
                  <Car size={16} />
                  Nog geen rit georganiseerd — bied een auto aan
                </button>
              )
            )}
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
    </div>
  );
}
