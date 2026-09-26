import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarRange, ChevronRight } from "lucide-react";
import { useCalendar } from "../../hooks/useCalendar";
import { routes } from "../../config/routes";
import { buildTrips, tripPhase, type Trip, type TripPhase } from "../../utils/trips";
import { TripSheet } from "./TripSheet";

const PAST_SHOWN = 8;

const PHASE_LABEL: Record<TripPhase, string | null> = { live: "Nu bezig", upcoming: null, past: null };

function TripRow({ trip, current, going, onPick }: { trip: Trip; current: boolean; going: boolean; onPick: () => void }) {
  const phase = tripPhase(trip);
  return (
    <li>
      <Link
        to={routes.trip.view(trip.id)}
        onClick={onPick}
        aria-current={current ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-sunken active:bg-sunken ${current ? "bg-sunken" : ""}`}
      >
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14.5px] font-semibold text-ink">{trip.title}</span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-3">
            {trip.dateRange}
            {trip.location ? ` · ${trip.location}` : ""}
          </span>
        </span>
        {current && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-semibold text-brand-text">Dit event</span>}
        {!current && PHASE_LABEL[phase] && <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-semibold text-brand-on">{PHASE_LABEL[phase]}</span>}
        {going && !current && <span className="shrink-0 text-[11px] font-semibold text-ink-3">Jij gaat mee</span>}
        <ChevronRight size={14} className="shrink-0 text-ink-3" />
      </Link>
    </li>
  );
}

/**
 * Every trip in one list, to jump from the trip you are looking at to another
 * one without going through the Agenda. Upcoming and current first (soonest
 * first), then the ones that are over (latest first).
 */
export function TripSwitcher({ open, onClose, currentId, myNames }: { open: boolean; onClose: () => void; currentId: string; myNames: string[] }) {
  const { data: events = [] } = useCalendar();
  const [showAllPast, setShowAllPast] = useState(false);

  const trips = buildTrips(events);
  const ahead = trips.filter((t) => tripPhase(t) !== "past").sort((a, b) => a.days[0].date.getTime() - b.days[0].date.getTime());
  const past = trips.filter((t) => tripPhase(t) === "past").sort((a, b) => b.days[0].date.getTime() - a.days[0].date.getTime());
  const goingTo = (t: Trip) => t.participants.some((p) => myNames.includes(p));
  const pastShown = showAllPast ? past : past.slice(0, PAST_SHOWN);

  return (
    <TripSheet open={open} onClose={onClose} title="Evenementen" subtitle="Kies een ander evenement">
      {ahead.length > 0 && (
        <section>
          <p className="section-label mb-1">Nu en binnenkort</p>
          <ul className="-mx-2 divide-y divide-line">
            {ahead.map((t) => <TripRow key={t.id} trip={t} current={t.id === currentId} going={goingTo(t)} onPick={onClose} />)}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section className={ahead.length > 0 ? "mt-5" : ""}>
          <p className="section-label mb-1">Geweest</p>
          <ul className="-mx-2 divide-y divide-line">
            {pastShown.map((t) => <TripRow key={t.id} trip={t} current={t.id === currentId} going={goingTo(t)} onPick={onClose} />)}
          </ul>
          {past.length > PAST_SHOWN && !showAllPast && (
            <button type="button" onClick={() => setShowAllPast(true)} className="mt-2 text-xs font-semibold text-brand-text hover:underline">
              Toon alle {past.length}
            </button>
          )}
        </section>
      )}
      {trips.length === 0 && <p className="py-8 text-center text-sm text-ink-3">Nog geen evenementen.</p>}
    </TripSheet>
  );
}

/** Opens the switcher. `iconOnly` is the top-bar variant; the full one sits under the tiles. */
export function TripSwitcherButton({ iconOnly, onClick }: { iconOnly?: boolean; onClick: () => void }) {
  return iconOnly ? (
    <button
      type="button"
      onClick={onClick}
      title="Andere evenementen"
      aria-label="Andere evenementen"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
    >
      <CalendarRange size={17} />
    </button>
  ) : (
    <button type="button" onClick={onClick} className="btn-secondary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm">
      <CalendarRange size={16} />
      Andere evenementen
    </button>
  );
}
