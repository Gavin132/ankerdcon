import { useParams, useNavigate } from "react-router-dom";
import { Car } from "lucide-react";
import { useRides } from "../hooks/useRides";
import { useCalendar } from "../hooks/useCalendar";
import { useUsers } from "../hooks/useUsers";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LinkedEventCard } from "../components/detail/LinkedEventCard";
import { RideHero } from "../components/ride/RideHero";
import { RideActions } from "../components/ride/RideActions";

export function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: rides = [], isLoading } = useRides();
  const { data: events = [] } = useCalendar();
  const { data: users = [] } = useUsers();

  const ride = rides.find((r) => r.id === id);
  const linkedEvent = ride?.linked_event_id
    ? events.find((e) => e.id === ride.linked_event_id)
    : undefined;

  const userNames = users.map((u) => u.name);

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
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">
          Terug
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DetailTopbar
        title={`${ride.direction} · ${ride.driver}`}
        onBack={() => navigate(-1)}
      />
      <RideHero ride={ride} linkedEvent={linkedEvent} users={users} />

      <div className="max-w-4xl mx-auto px-4 py-7 space-y-5">
        <RideActions ride={ride} userNames={userNames} users={users} />
        {linkedEvent && <LinkedEventCard event={linkedEvent} />}
      </div>
    </div>
  );
}
