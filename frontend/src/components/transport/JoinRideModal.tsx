import { useEffect, useMemo, useRef, useState } from "react";
import { TripSheet } from "../trip/TripSheet";
import { DayChips } from "../trip/DayChips";
import { RideRow } from "./RideRow";
import { useRides } from "../../hooks/useRides";
import { useMeals } from "../../hooks/useMeals";
import { useCurrentUser, useUsers } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { parseEventDate, toDateKey } from "../../utils/date";
import { planQuickRide } from "../../utils/quickRide";
import { buildTrip, tripGaps, tripIdOf } from "../../utils/trips";
import { dayForDateKey } from "../../utils/transportView";
import { getNow } from "../../store/time.store";
import type { CalendarEvent, Direction, Ride } from "../../types";

interface JoinRideModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  /** The way the hub tile thinks you are going; that section is scrolled into view. */
  initialDirection: Direction;
  /** Switch over to the "offer a ride" flow instead, e.g. when nothing matches. */
  onOfferInstead: () => void;
}

const SECTIONS: { direction: "Inbound" | "Outbound"; label: string }[] = [
  { direction: "Inbound", label: "Heen" },
  { direction: "Outbound", label: "Terug" },
];

const departureOf = (r: Ride) => new Date(r.departure_time.replace(" ", "T")).getTime();

/**
 * "Meerijden" from the hub: laid out like the Vervoer sheet of the event page. One day
 * at a time (day chips on a multi-day trip), Heen and Terug under each other, a row per
 * ride, your own in blue, and getting in one tap away (RideRow).
 */
export function JoinRideModal({ open, onClose, event, initialDirection, onOfferInstead }: JoinRideModalProps) {
  const { data: rides = [] } = useRides();
  const { data: meals = [] } = useMeals();
  const { data: users = [] } = useUsers();
  const { data: me } = useCurrentUser();
  const { data: allEvents = [] } = useCalendar();

  // The trip this event belongs to, with all its days: a ride offered for day 2 is just
  // as relevant from day 1's hub tile.
  const trip = useMemo(() => buildTrip(allEvents, tripIdOf(event)), [allEvents, event]);
  const days = trip?.days ?? [];

  const [activeDayId, setActiveDayId] = useState<string>(event.id);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const sectionRefs = useRef<Partial<Record<Direction, HTMLElement | null>>>({});

  // The hub tile picks the day and direction from the date and time of day at the moment it
  // is tapped, and this sheet stays mounted: start fresh every time it opens, on the day the
  // tile would offer a ride for.
  useEffect(() => {
    if (!open) return;
    setExpandedRideId(null);
    if (days.length > 0) {
      const plan = planQuickRide(days.map((d) => d.date));
      setActiveDayId(dayForDateKey(days, plan.departure.slice(0, 10)));
    }
    if (initialDirection === "Outbound") {
      // After the sheet's slide-in, so the scroll isn't swallowed by it.
      const t = window.setTimeout(() => sectionRefs.current.Outbound?.scrollIntoView({ block: "start", behavior: "smooth" }), 450);
      return () => window.clearTimeout(t);
    }
    // Only on open: later changes to the rides must not undo a day the member picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDirection]);

  const activeDay = days.find((d) => d.ev.id === activeDayId) ?? days[0];
  const activeKey = activeDay ? toDateKey(activeDay.date) : toDateKey(parseEventDate(event.date) ?? getNow());

  // A day with someone still without Heen or Terug gets the amber dot, as in the Vervoer sheet.
  const gaps = trip ? tripGaps(trip, rides, meals).transport : [];
  const dayNeedsAttention = (id: string) =>
    !!trip &&
    ((id === days[0]?.ev.id && gaps.some((g) => g.items.includes("Heen"))) ||
      (id === days[days.length - 1]?.ev.id && gaps.some((g) => g.items.includes("Terug"))));

  // Still shown up to an hour after departure (dimmed), then dropped: no point offering a ride that's long gone.
  const dayRides = rides.filter((r) => {
    if (r.direction !== "Inbound" && r.direction !== "Outbound") return false;
    const dep = departureOf(r);
    return !isNaN(dep) && toDateKey(new Date(dep)) === activeKey && (getNow().getTime() - dep) / 60000 < 60;
  });

  const userNames = users.map((u) => u.name);
  const resolve = (stored: string) =>
    users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored))?.name ?? stored;
  const isMine = (r: Ride) =>
    !!me && (resolve(r.driver) === me.name || r.passengers.some((p) => resolve(p) === me.name));

  function close() {
    setExpandedRideId(null);
    onClose();
  }

  function pickDay(id: string) {
    setActiveDayId(id);
    setExpandedRideId(null);
  }

  return (
    <TripSheet open={open} onClose={close} title="Meerijden" subtitle={`Ritten voor ${event.event_name}`}>
      <div className="space-y-5">
        {days.length > 1 && (
          <DayChips days={days} value={activeDay.ev.id} onChange={(id) => id && pickDay(id)} attention={dayNeedsAttention} />
        )}

        <div className="space-y-6">
          {SECTIONS.map(({ direction, label }) => {
            const sectionRides = dayRides.filter((r) => r.direction === direction).sort((a, b) => departureOf(a) - departureOf(b));
            return (
              <section
                key={direction}
                ref={(el) => { sectionRefs.current[direction] = el; }}
                className="scroll-mt-2 space-y-2.5"
              >
                <h3 className="flex items-baseline gap-2 font-display text-[22px] font-extrabold uppercase leading-none text-ink">
                  {label}
                  {sectionRides.length > 0 && (
                    <span className="font-mono text-[12px] font-semibold tabular-nums text-ink-3">{sectionRides.length}</span>
                  )}
                </h3>

                {sectionRides.length === 0 ? (
                  <p className="py-1 text-xs text-ink-3">Nog geen rit.</p>
                ) : (
                  <div className="card-surface divide-y divide-line overflow-hidden">
                    {sectionRides.map((ride) => (
                      <RideRow
                        key={ride.id}
                        ride={ride}
                        userNames={userNames}
                        mine={isMine(ride)}
                        expanded={expandedRideId === ride.id}
                        onToggle={() => setExpandedRideId((prev) => (prev === ride.id ? null : ride.id))}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <button type="button" onClick={onOfferInstead} className="text-xs font-semibold text-brand-text hover:underline">
          Zelf een rit aanbieden?
        </button>
      </div>
    </TripSheet>
  );
}
