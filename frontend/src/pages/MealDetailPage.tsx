import { useParams, useNavigate } from "react-router-dom";
import { UtensilsCrossed } from "lucide-react";
import { useMeals } from "../hooks/useMeals";
import { useCalendar } from "../hooks/useCalendar";
import { useUsers } from "../hooks/useUsers";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LinkedEventCard } from "../components/detail/LinkedEventCard";
import { MealHero } from "../components/meal/MealHero";
import { MealLinks } from "../components/meal/MealLinks";
import { MealPractical } from "../components/meal/MealPractical";
import { MealRsvpSection } from "../components/meal/MealRsvpSection";

export function MealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: meals = [], isLoading } = useMeals();
  const { data: events = [] } = useCalendar();
  const { data: users = [] } = useUsers();

  const meal = meals.find((m) => m.id === id);
  const linkedEvent = meal?.linked_event_id
    ? events.find((e) => e.id === meal.linked_event_id)
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

      <div className="max-w-4xl mx-auto px-4 py-7 space-y-5">
        <MealLinks website={meal.website} menuUrl={meal.menu_url} />
        <MealPractical meal={meal} />
        <MealRsvpSection meal={meal} userNames={userNames} users={users} />
        {linkedEvent && <LinkedEventCard event={linkedEvent} />}
      </div>
    </div>
  );
}
