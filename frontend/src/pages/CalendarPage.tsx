import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CalendarPlus, Copy, Check } from "lucide-react";
import { TicketStack } from "../components/calendar/TicketStack";
import { CollectedStubs } from "../components/calendar/CollectedStubs";
import { RecapView } from "../components/calendar/recap/RecapView";
import { TripRsvpModal } from "../components/calendar/TripRsvpModal";
import { EmptyState } from "../components/common/EmptyState";
import { useUsers } from "../hooks/useUsers";
import { useMeals } from "../hooks/useMeals";
import { useRides } from "../hooks/useRides";
import { useCalendar } from "../hooks/useCalendar";
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

  const feedUrl = `${env.API_BASE_URL || window.location.origin}/api/calendar/feed.ics`;
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, "webcal:"))}`;

  function copyFeedUrl() {
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
        title="Nog geen events"
        description="Zodra er een event gepland is, verschijnt het hier."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setSubscribeOpen((v) => !v)}
          aria-expanded={subscribeOpen}
          className={`flex items-center gap-1.5 rounded-[10px] border-1.5 px-3 py-1.5 text-[13px] font-semibold transition-colors ${
            subscribeOpen
              ? "border-outline bg-ink text-paper dark:bg-brand dark:text-brand-on"
              : "border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
          }`}
        >
          <CalendarPlus size={14} />
          Abonneren
        </button>
        <div className="flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]" role="group" aria-label="Weergave">
          {(["tickets", "recap"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setCalendarView(view)}
              aria-pressed={calendarView === view}
              className={`rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                calendarView === view
                  ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {view === "tickets" ? "Tickets" : "Recap"}
            </button>
          ))}
        </div>
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
            <div className="card-surface flex items-center gap-2 px-3.5 py-2.5">
              <p className="flex-1 truncate font-mono text-[11.5px] text-ink-2">
                {feedUrl}
              </p>
              <button
                onClick={copyFeedUrl}
                title="Kopieer link"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
              >
                {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
              </button>
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 whitespace-nowrap rounded-lg border-1.5 border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-ink-3"
              >
                Google Calendar
              </a>
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
                  icon={<CalendarDays size={28} />}
                  title="Niks gepland"
                  description="Er staat nog geen nieuw event in de agenda. Hieronder vind je alles waar jullie al geweest zijn."
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
