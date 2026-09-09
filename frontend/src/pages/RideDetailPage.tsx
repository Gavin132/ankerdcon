import { useState } from "react";
import { useParams } from "react-router-dom";
import { Car, Plus } from "lucide-react";
import { useRides, useClaimSeat, useLeaveSeat } from "../hooks/useRides";
import { useCalendar } from "../hooks/useCalendar";
import { useMeals } from "../hooks/useMeals";
import { useUsers } from "../hooks/useUsers";
import { useSmartBack } from "../hooks/useSmartBack";
import { toast } from "../store/toast.store";
import { routes } from "../config/routes";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { LinkedEventCard } from "../components/detail/LinkedEventCard";
import { LinkedMealCard } from "../components/detail/LinkedMealCard";
import { RideHero } from "../components/ride/RideHero";
import { RideActions } from "../components/ride/RideActions";
import { RestaurantDetailActions } from "../components/ride/RestaurantDetailActions";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { NamePicker } from "../components/common/NamePicker";

export function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const goBack = useSmartBack(routes.transport);

  const { data: rides = [], isLoading } = useRides();
  const { data: events = [] } = useCalendar();
  const { data: meals = [] } = useMeals();
  const { data: users = [] } = useUsers();

  const [claimOpen, setClaimOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [claimNames, setClaimNames] = useState<string[]>([]);
  const [leaveNames, setLeaveNames] = useState<string[]>([]);
  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();

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

  function resolveUser(stored: string) {
    return users.find(
      (u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored),
    );
  }

  const resolvedPassengers = ride ? new Set(ride.passengers.map((p) => resolveUser(p)?.name ?? p)) : new Set();
  const availableToJoin = userNames.filter((n) => !resolvedPassengers.has(n));

  async function handleClaim() {
    if (!ride || claimNames.length === 0) return;
    try {
      for (const name of claimNames) {
        await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
      }
      setClaimNames([]);
      setClaimOpen(false);
      toast("success", claimNames.length === 1 ? `${claimNames[0]} staat in de rit!` : `${claimNames.length} personen staan in de rit!`);
    } catch {
      toast("error", "Kon plek niet claimen.");
    }
  }

  async function handleLeave() {
    if (!ride || leaveNames.length === 0) return;
    try {
      for (const name of leaveNames) {
        await leaveMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
      }
      setLeaveNames([]);
      setLeaveOpen(false);
      toast("success", leaveNames.length === 1 ? `${leaveNames[0]} is uitgestapt.` : `${leaveNames.length} personen uitgestapt.`);
    } catch {
      toast("error", "Kon je niet uitschrijven.");
    }
  }

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: ride ? (isRestaurant ? `Restaurant · ${ride.start_location}` : `${ride.direction} · ${ride.driver}`) : undefined,
          url,
        });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DetailTopbar title="Laden…" onBack={goBack} />
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
        <button onClick={goBack} className="text-xs text-sky-500 underline">Terug</button>
      </div>
    );
  }

  const isPT = ride.is_public_transport;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DetailTopbar
        title={isRestaurant ? `Restaurant · ${ride.start_location}` : `${ride.direction} · ${ride.driver}`}
        onBack={goBack}
        onShare={onShare}
      />
      <RideHero
        ride={ride}
        linkedEvent={linkedEvent}
        linkedMeal={linkedMeal}
        users={users}
        onClaimClick={isRestaurant ? undefined : () => { setClaimNames([]); setClaimOpen(true); }}
        onLeaveClick={isRestaurant ? undefined : () => { setLeaveNames([]); setLeaveOpen(true); }}
      />

      <div className="max-w-4xl mx-auto px-4 py-7">
        <div className={`grid gap-5 items-start ${linkedCard ? "grid-cols-1 lg:grid-cols-3" : ""}`}>
          <div className={linkedCard ? "lg:col-span-2" : ""}>
            {isRestaurant ? (
              <RestaurantDetailActions ride={ride} userNames={userNames} users={users} linkedMeal={linkedMeal} />
            ) : (
              <RideActions ride={ride} />
            )}
          </div>
          {linkedCard && (
            <div>{linkedCard}</div>
          )}
        </div>
      </div>

      {!isRestaurant && (
        <>
          {/* Stap in modal */}
          <Modal
            open={claimOpen}
            onClose={() => { setClaimOpen(false); setClaimNames([]); }}
            title="Stap in"
            description={`${ride.start_location} → ${ride.end_location || "Bestemming"}${isPT ? "" : ` · ${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}`}
            accent="from-sky-400 to-blue-500"
          >
            <div className="space-y-3">
              <NamePicker
                multiple
                options={availableToJoin}
                value={claimNames}
                onChange={setClaimNames}
                maxSelect={isPT ? undefined : ride.seats_left}
                color="sky"
              />
              <Button
                onClick={handleClaim}
                loading={claimMutation.isPending}
                className="w-full"
                disabled={claimNames.length === 0}
              >
                <Plus size={15} />
                {claimNames.length === 0
                  ? "Selecteer een naam"
                  : claimNames.length === 1
                    ? `${claimNames[0]} stapt in`
                    : `${claimNames.length} personen stappen in`}
              </Button>
            </div>
          </Modal>

          {/* Uitstappen modal */}
          <Modal
            open={leaveOpen}
            onClose={() => { setLeaveOpen(false); setLeaveNames([]); }}
            title="Uitstappen"
            description="Wie stappen er uit?"
            accent="from-rose-400 to-red-500"
          >
            <div className="space-y-3">
              <NamePicker
                multiple
                options={ride.passengers}
                value={leaveNames}
                onChange={setLeaveNames}
                color="rose"
              />
              <Button
                onClick={handleLeave}
                variant="danger"
                loading={leaveMutation.isPending}
                className="w-full"
                disabled={leaveNames.length === 0}
              >
                {leaveNames.length === 0
                  ? "Selecteer een naam"
                  : leaveNames.length === 1
                    ? `${leaveNames[0]} uitstappen`
                    : `${leaveNames.length} personen uitstappen`}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
