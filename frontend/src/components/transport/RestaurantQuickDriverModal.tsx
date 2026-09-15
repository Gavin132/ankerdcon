import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { useCurrentUser } from "../../hooks/useUsers";
import { useCreateRide, useAddRestaurantDriver, useClaimSeat } from "../../hooks/useRides";
import { toast } from "../../store/toast.store";
import { splitDateTime, toDateTimeLocal } from "../../utils/date";
import type { CalendarEvent, Meal, Ride } from "../../types";

interface RestaurantQuickDriverModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  meal: Meal;
  /** The shared Restaurant-direction ride for this meal, if one already exists. */
  existingRide?: Ride;
}

/**
 * Restaurant rides work differently from the hotel-shuttle ones: everyone
 * going to the same meal shares a single Ride record, and "offering a ride"
 * means registering yourself as one of its drivers (mirroring the "Ik rijd"
 * flow on the ride detail page) rather than creating a brand-new Ride. If no
 * Restaurant ride exists yet for this meal, this quick popup creates the
 * shared one first and immediately registers you as its first driver.
 */
export function RestaurantQuickDriverModal({ open, onClose, event, meal, existingRide }: RestaurantQuickDriverModalProps) {
  const { data: me } = useCurrentUser();
  const driver = me?.name ?? "";
  const createRideMutation = useCreateRide();
  const addDriverMutation = useAddRestaurantDriver();
  const claimMutation = useClaimSeat();

  const [seats, setSeats] = useState(5);
  const [departureTime, setDepartureTime] = useState("");

  useEffect(() => {
    if (!open) return;
    setSeats(5);
    const fallback = new Date(meal.time.replace(" ", "T"));
    setDepartureTime(toDateTimeLocal(isNaN(fallback.getTime()) ? new Date() : fallback));
  }, [open, meal.time]);

  const alreadyDriving = !!existingRide?.restaurant_drivers?.some((d) => d.name === driver);
  const attendees = existingRide ? (meal.participants ?? []) : [];

  async function onSubmit() {
    if (!driver || alreadyDriving) return;
    try {
      let rideId = existingRide?.id;
      if (!rideId) {
        const created = await createRideMutation.mutateAsync({
          direction: "Restaurant",
          vehicle_type: "Car",
          driver,
          departure_time: departureTime,
          start_location: meal.location || meal.meal_name,
          total_seats: 99,
          action_required: true,
          linked_meal_id: meal.id,
          linked_event_id: event.id,
        });
        rideId = created.id;
      }
      await addDriverMutation.mutateAsync({ id: rideId, payload: { user_name: driver, seats } });
      if (!attendees.includes(driver)) {
        await claimMutation.mutateAsync({ id: rideId, payload: { user_name: driver } });
      }
      toast("success", "Je rijdt mee!");
      onClose();
    } catch {
      toast("error", "Kon de rit niet aanmaken. Probeer opnieuw.");
    }
  }

  const isPending = createRideMutation.isPending || addDriverMutation.isPending || claimMutation.isPending;

  const footer = !alreadyDriving && (
    <Button onClick={onSubmit} loading={isPending} className="w-full">
      <Car size={15} />
      {existingRide ? `Rijd mee met ${seats} plaatsen` : `Rit aanmaken met ${seats} plaatsen`}
    </Button>
  );

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Ik rijd naar het restaurant"
      subtitle={`Hoeveel mensen kun je meenemen naar ${meal.location || meal.meal_name}?`}
      footer={footer}
    >
      <div className="space-y-5">
        {alreadyDriving ? (
          <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            Je staat al als chauffeur geregistreerd voor deze rit. Pas je aantal plaatsen aan via de ritdetails.
          </p>
        ) : (
          <>
            {!existingRide && (
              <div>
                <label className="section-label mb-1.5 block">
                  Vertrektijd
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="input-field"
                    value={splitDateTime(departureTime)[0]}
                    onChange={(e) => setDepartureTime(`${e.target.value}T${splitDateTime(departureTime)[1] || "09:00"}`)}
                  />
                  <input
                    type="time"
                    className="input-field"
                    value={splitDateTime(departureTime)[1]}
                    onChange={(e) => setDepartureTime(`${splitDateTime(departureTime)[0]}T${e.target.value}`)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="section-label mb-1.5 block">
                Totaal aantal plekken in je auto
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeats(n)}
                    aria-pressed={seats === n}
                    className={`flex h-10 flex-1 items-center justify-center rounded-xl font-mono text-sm font-semibold tabular-nums transition-colors ${
                      seats === n
                        ? "border-2 border-outline bg-brand text-brand-on"
                        : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-3">Incl. jezelf</p>
            </div>
          </>
        )}
      </div>
    </TripSheet>
  );
}
