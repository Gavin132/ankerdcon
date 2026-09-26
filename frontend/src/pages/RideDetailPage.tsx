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
  const goBack = useSmartBack(routes.currentTrip.tab("transport"));

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
      <div className="min-h-screen bg-paper">
        <DetailTopbar title="Laden…" onBack={goBack} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
          <Car size={22} />
        </span>
        <p className="text-sm font-semibold text-ink">Rit niet gevonden</p>
        <button onClick={goBack} className="text-xs font-semibold text-brand-text hover:underline">Terug</button>
      </div>
    );
  }

  const isPT = ride.is_public_transport;

  return (
    <div className="min-h-screen bg-paper">
      <DetailTopbar
        title={isRestaurant ? `Restaurant · ${ride.start_location}` : `${ride.direction === "Inbound" ? "Heen" : "Terug"} · ${ride.driver}`}
        onBack={goBack}
        onShare={onShare}
      />
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 pt-4 sm:pt-6">
        <RideHero
          ride={ride}
          linkedEvent={linkedEvent}
          linkedMeal={linkedMeal}
          users={users}
          onClaimClick={isRestaurant ? undefined : () => { setClaimNames([]); setClaimOpen(true); }}
          onLeaveClick={isRestaurant ? undefined : () => { setLeaveNames([]); setLeaveOpen(true); }}
        />

        {isRestaurant ? (
          <RestaurantDetailActions ride={ride} userNames={userNames} users={users} linkedMeal={linkedMeal} />
        ) : (
          <RideActions ride={ride} />
        )}
        {linkedCard}
      </div>

      {!isRestaurant && (
        <>
          {/* Stap in modal */}
          <Modal
            open={claimOpen}
            onClose={() => { setClaimOpen(false); setClaimNames([]); }}
            title="Stap in"
            description={`${ride.start_location} → ${ride.end_location || "Bestemming"}${isPT ? "" : ` · ${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}`}
            accent="from-sky-400"
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
            accent="from-rose-500"
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
