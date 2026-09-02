import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { useCurrentUser } from "../../hooks/useUsers";
import { useCreateRide, useAddRestaurantDriver, useClaimSeat } from "../../hooks/useRides";
import { toast } from "../../store/toast.store";
import type { CalendarEvent, Meal, Ride } from "../../types";

interface RestaurantQuickDriverModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  meal: Meal;
  /** The shared Restaurant-direction ride for this meal, if one already exists. */
  existingRide?: Ride;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    setDepartureTime(toLocalInputValue(isNaN(fallback.getTime()) ? new Date() : fallback));
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ik rijd naar het restaurant"
      description={`Hoeveel mensen kun je meenemen naar ${meal.location || meal.meal_name}?`}
    >
      <div className="space-y-5">
        {alreadyDriving ? (
          <p className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            Je staat al als chauffeur geregistreerd voor deze rit. Pas je aantal plaatsen aan via de ritdetails.
          </p>
        ) : (
          <>
            {!existingRide && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                  Vertrektijd
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                Totaal aantal plekken in je auto
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeats(n)}
                    className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                      seats === n
                        ? "gradient-brand text-white shadow-sm"
                        : "border border-slate-200 text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Incl. jezelf</p>
            </div>

            <Button onClick={onSubmit} loading={isPending} className="w-full">
              <Car size={15} />
              {existingRide ? `Rijd mee met ${seats} plaatsen` : `Rit aanmaken met ${seats} plaatsen`}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
