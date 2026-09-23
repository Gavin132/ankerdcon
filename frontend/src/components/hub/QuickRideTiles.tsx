import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, ChevronRight, Users } from "lucide-react";
import { routes } from "../../config/routes";
import { useCalendar } from "../../hooks/useCalendar";
import { parseEventDate } from "../../utils/date";
import { planQuickRide } from "../../utils/quickRide";
import { tripIdOf } from "../../utils/trips";
import { QuickRideModal } from "../transport/QuickRideModal";
import { JoinRideModal } from "../transport/JoinRideModal";
import { RestaurantQuickDriverModal } from "../transport/RestaurantQuickDriverModal";
import type { CalendarEvent, Meal, Ride } from "../../types";

interface QuickRideTilesProps {
  /** The nearest upcoming event. */
  event: CalendarEvent;
  /** A meal later that day still needing transport — only ever set for a
   * non-hotel event (see HubPage). When present, the evening tile switches
   * over to the shared Restaurant-direction ride for it instead of the
   * regular hotel/home leg, since that's the more immediately relevant ride. */
  restaurantMeal?: Meal;
  rides?: Ride[];
}

function QuickTile({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl border-1.5 border-line bg-surface p-3.5 text-left transition-colors hover:border-ink-3"
    >
      <span className="flex w-full items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sunken text-ink">{icon}</span>
        <ChevronRight size={15} className="text-ink-3" />
      </span>
      <span>
        <span className="block text-[14px] font-semibold leading-tight text-ink">{title}</span>
        <span className="mt-1 block text-[11px] leading-snug text-ink-3">{hint}</span>
      </span>
    </button>
  );
}

/** Two hub shortcuts for getting to/from the event. The titles are fixed;
 * the grey line says what the sheet will open on — which direction and when
 * (see `planQuickRide`), or "naar restaurant" in the evening when there's a
 * meal still needing a ride. */
export function QuickRideTiles({ event, restaurantMeal, rides = [] }: QuickRideTilesProps) {
  const navigate = useNavigate();
  const [offerOpen, setOfferOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [restaurantOfferOpen, setRestaurantOfferOpen] = useState(false);

  const { data: allEvents = [] } = useCalendar();
  const groupDays = (event.multi_day_id ? allEvents.filter((e) => e.multi_day_id === event.multi_day_id) : [event])
    .map((e) => parseEventDate(e.date))
    .filter((d): d is Date => d !== null);
  const plan = planQuickRide(groupDays);
  const direction = plan.direction;
  const toHotel = direction === "Outbound";
  const isRestaurantLeg = toHotel && !!restaurantMeal;

  const where = event.is_hotel
    ? (toHotel ? "Naar hotel" : "Naar evenement")
    : (toHotel ? "Naar huis" : "Naar evenement");
  const hint = isRestaurantLeg ? "Naar restaurant" : `${where} · ${plan.when}`;

  const existingRestaurantRide = isRestaurantLeg
    ? rides.find((r) => r.direction === "Restaurant" && r.linked_meal_id === restaurantMeal!.id)
    : undefined;

  function handleOfferClick() {
    if (isRestaurantLeg) setRestaurantOfferOpen(true);
    else setOfferOpen(true);
  }

  function handleJoinClick() {
    if (!isRestaurantLeg) { setJoinOpen(true); return; }
    if (existingRestaurantRide) navigate(routes.ride.view(existingRestaurantRide.id));
    else navigate(routes.trip.view(tripIdOf(event), "transport"), { state: { tab: "Restaurant" } });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <QuickTile icon={<Car size={16} />} title="Rit aanbieden" hint={hint} onClick={handleOfferClick} />
        <QuickTile icon={<Users size={16} />} title="Meerijden" hint={hint} onClick={handleJoinClick} />
      </div>

      {isRestaurantLeg ? (
        <RestaurantQuickDriverModal
          open={restaurantOfferOpen}
          onClose={() => setRestaurantOfferOpen(false)}
          event={event}
          meal={restaurantMeal!}
          existingRide={existingRestaurantRide}
        />
      ) : (
        <>
          <QuickRideModal
            open={offerOpen}
            onClose={() => setOfferOpen(false)}
            event={event}
            initialDirection={direction}
            initialDeparture={plan.departure}
          />

          <JoinRideModal
            open={joinOpen}
            onClose={() => setJoinOpen(false)}
            event={event}
            initialDirection={direction}
            onOfferInstead={() => { setJoinOpen(false); setOfferOpen(true); }}
          />
        </>
      )}
    </>
  );
}
