import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CalendarPlus, Copy, Check } from "lucide-react";
import { TicketStack } from "../components/calendar/TicketStack";
import { CollectedStubs } from "../components/calendar/CollectedStubs";
import { RecapView } from "../components/calendar/recap/RecapView";
import { TripRsvpModal } from "../components/calendar/TripRsvpModal";
import { EmptyState } from "../components/common/EmptyState";
import { Segmented } from "../components/common/Segmented";
import { useUsers } from "../hooks/useUsers";
import { useMeals } from "../hooks/useMeals";
import { useRides } from "../hooks/useRides";
import { useCalendar, useCalendarFeedPath } from "../hooks/useCalendar";
import { useTripRsvp } from "../hooks/useTripRsvp";
import { useTimeStore } from "../store/time.store";
import { toDateKey, todayKey } from "../utils/date";
import { buildTrips, type Trip, type TripDay } from "../utils/trips";
import { env } from "../config/env";

/**
 * Agenda tab: upcoming trips as a stack of tickets with past trips collected
 * as stubs underneath, or Recap — a month grid for looking back at past
 * trips (and ahead). Sign-up and the .ics feed live here too.
 */
export function CalendarPage() {
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const [calendarView, setCalendarView] = useState<"tickets" | "recap">("tickets");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manageTripId, setManageTripId] = useState<string | null>(null);
  const [justJoinedId, setJustJoinedId] = useState<string | null>(null);

  const { data: users = [] } = useUsers();
  const { data: calendarEvents = [], isLoading } = useCalendar();
  const { data: meals = [] } = useMeals();
  const { data: rides = [] } = useRides();
  const tripRsvp = useTripRsvp();
  const { myNames, manageRsvp } = tripRsvp;

  const trips = useMemo(() => buildTrips(calendarEvents), [calendarEvents]);
  const today = todayKey();
  const upcomingTrips = trips.filter((t) => toDateKey(t.days[t.days.length - 1].date) >= today);
  const pastTrips = trips.filter((t) => toDateKey(t.days[t.days.length - 1].date) < today).reverse();
  const manageTrip = trips.find((t) => t.id === manageTripId) ?? null;

  const { data: feedPath } = useCalendarFeedPath(subscribeOpen);
  const feedUrl = feedPath ? `${env.API_BASE_URL || window.location.origin}${feedPath}` : "";
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, "webcal:"))}`;

  function copyFeedUrl() {
    if (!feedUrl) return;
    navigator.clipboard.writeText(feedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function joinTrip(trip: Trip) {
    setJustJoinedId(trip.id);
    return tripRsvp.joinTrip(trip);
  }

  async function toggleDay(trip: Trip, day: TripDay) {
    const joined = await tripRsvp.toggleDay(day);
    if (joined) setJustJoinedId(trip.id);
  }

  function leaveTrip(trip: Trip) {
    setJustJoinedId(null);
    return tripRsvp.leaveTrip(trip);
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 rounded-xl bg-sunken" />
        <div className="h-72 rounded-2xl bg-sunken" />
        <div className="h-24 rounded-2xl bg-sunken" />
      </div>
    );
  }

  if (calendarEvents.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={36} />}
        title="Nog geen evenementen"
        description="Zodra er een evenement gepland is, verschijnt het hier."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSubscribeOpen((v) => !v)}
          aria-expanded={subscribeOpen}
          className="btn-secondary px-3 text-[13px]"
        >
          <CalendarPlus size={16} />
          Agenda-link
        </button>
        <Segmented
          label="Weergave"
          options={[{ value: "tickets", label: "Tickets" }, { value: "recap", label: "Recap" }]}
          value={calendarView}
          onChange={setCalendarView}
        />
      </div>

      <AnimatePresence>
        {subscribeOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="card-surface space-y-3 p-4">
              <p className="text-sm text-ink-2">Zet alle evenementen in je eigen agenda. De link blijft bijgewerkt.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copyFeedUrl} disabled={!feedUrl} className="btn-secondary px-3 text-[13px]">
                  {copied ? <Check size={16} className="text-ok" /> : <Copy size={16} />}
                  {copied ? "Gekopieerd" : feedUrl ? "Kopieer link" : "Link ophalen…"}
                </button>
                <a
                  href={feedUrl ? googleCalUrl : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!feedUrl}
                  className="btn-secondary px-3 text-[13px]"
                >
                  Google Calendar
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {calendarView === "tickets" ? (
          <motion.div key="tickets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
            {upcomingTrips.length > 0 ? (
              <TicketStack
                trips={upcomingTrips}
                meals={meals}
                users={users}
                myNames={myNames}
                justJoinedId={justJoinedId}
                onJoin={joinTrip}
                onLeave={leaveTrip}
                onToggleDay={toggleDay}
              />
            ) : (
              <div className="card-surface">
                <EmptyState
                  compact
                  icon={<CalendarDays size={28} />}
                  title="Niks gepland"
                  description="Er staat nog geen nieuw evenement in de agenda. Hieronder vind je alles waar jullie al geweest zijn."
                />
              </div>
            )}
            <CollectedStubs trips={pastTrips} myNames={myNames} />
          </motion.div>
        ) : (
          <motion.div key="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <RecapView
              trips={trips}
              myNames={myNames}
              users={users}
              rides={rides}
              meals={meals}
              onJoin={joinTrip}
              onLeave={leaveTrip}
              onManage={(trip) => setManageTripId(trip.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <TripRsvpModal
        trip={manageTrip}
        users={users}
        onClose={() => setManageTripId(null)}
        onConfirm={manageRsvp}
      />
    </div>
  );
}
