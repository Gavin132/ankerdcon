import { useParams, useNavigate } from "react-router-dom";
import { Car } from "lucide-react";
import { useRides } from "../hooks/useRides";
import { useCalendar } from "../hooks/useCalendar";
import { useMeals } from "../hooks/useMeals";
import { useUsers } from "../hooks/useUsers";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LinkedEventCard } from "../components/detail/LinkedEventCard";
import { LinkedMealCard } from "../components/detail/LinkedMealCard";
import { RideHero } from "../components/ride/RideHero";
import { RideActions } from "../components/ride/RideActions";
import { RestaurantDetailActions } from "../components/ride/RestaurantDetailActions";

export function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: rides = [], isLoading } = useRides();
  const { data: events = [] } = useCalendar();
  const { data: meals = [] } = useMeals();
  const { data: users = [] } = useUsers();

  const ride = rides.find((r) => r.id === id);
  const linkedEvent = ride?.linked_event_id ? events.find((e) => e.id === ride.linked_event_id) : undefined;
  const linkedMeal = ride?.linked_meal_id ? meals.find((m) => m.id === ride.linked_meal_id) : undefined;

  const userNames = users.map((u) => u.name);
  const isRestaurant = ride?.direction === "Restaurant";

  const linkedCard = linkedMeal
    ? <LinkedMealCard meal={linkedMeal} />
    : linkedEvent
      ? <LinkedEventCard event={linkedEvent} />
      : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DetailTopbar title="Laden…" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <Car size={40} className="opacity-30" />
        <p className="text-sm">Rit niet gevonden</p>
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">Terug</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DetailTopbar
        title={isRestaurant ? `Restaurant · ${ride.start_location}` : `${ride.direction} · ${ride.driver}`}
        onBack={() => navigate(-1)}
      />
      <RideHero ride={ride} linkedEvent={linkedEvent} linkedMeal={linkedMeal} users={users} />

      <div className="max-w-4xl mx-auto px-4 py-7">
        <div className={`grid gap-5 items-start ${linkedCard ? "grid-cols-1 lg:grid-cols-3" : ""}`}>
          <div className={linkedCard ? "lg:col-span-2" : ""}>
            {isRestaurant ? (
              <RestaurantDetailActions ride={ride} userNames={userNames} users={users} linkedMeal={linkedMeal} />
            ) : (
              <RideActions ride={ride} userNames={userNames} users={users} />
            )}
          </div>
          {linkedCard && (
            <div>{linkedCard}</div>
          )}
        </div>
      </div>
    </div>
  );
}
