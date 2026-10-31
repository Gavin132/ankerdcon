import { useState } from "react";
import { AgendaTicket } from "./AgendaTicket";
import { Carousel } from "../common/Carousel";
import type { Trip, TripDay } from "../../utils/trips";
import type { Meal, User } from "../../types";

interface TicketStackProps {
  trips: Trip[];
  meals: Meal[];
  users: User[];
  myNames: string[];
  justJoinedId: string | null;
  onJoin: (trip: Trip) => void;
  onLeave: (trip: Trip) => void;
  onToggleDay: (trip: Trip, day: TripDay) => void;
}

/**
 * Agenda › upcoming trips as tickets in a row you swipe through, the next trip first: the same `Carousel` as the Hub and the
 * event page, so paging through events moves the same way everywhere. Dots and arrows sit under it.
 */
export function TicketStack({ trips, meals, users, myNames, justJoinedId, onJoin, onLeave, onToggleDay }: TicketStackProps) {
  const [shown, setShown] = useState(0);
  if (trips.length === 0) return null;

  return (
    <section aria-roledescription="carrousel" aria-label="Komende evenementen" className="space-y-3">
      <Carousel
        items={trips}
        itemKey={(trip) => trip.id}
        onIndexChange={setShown}
        pager={{
          dotLabel: (i) => `${trips[i].title}, ${trips[i].dateRange}`,
          prevLabel: "Vorig evenement",
          nextLabel: "Volgend evenement",
          arrowsFrom: "md",
        }}
        renderItem={(trip) => (
          <AgendaTicket
            trip={trip}
            meals={meals}
            users={users}
            myNames={myNames}
            justJoined={justJoinedId === trip.id}
            onJoin={() => onJoin(trip)}
            onLeave={() => onLeave(trip)}
            onToggleDay={(day) => onToggleDay(trip, day)}
          />
        )}
      />
      {trips.length > 1 && <p className="text-center text-[12.5px] text-ink-3">{Math.min(shown, trips.length - 1) + 1} van {trips.length}</p>}
    </section>
  );
}
