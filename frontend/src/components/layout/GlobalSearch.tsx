import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, X, CalendarDays, Car, Utensils, Sparkles, Users, Zap, MapPin, BedDouble, Camera, Wallet } from "lucide-react";
import { useCalendar } from "../../hooks/useCalendar";
import { useRides } from "../../hooks/useRides";
import { useMeals } from "../../hooks/useMeals";
import { useCosplays } from "../../hooks/useCosplays";
import { useUsers } from "../../hooks/useUsers";
import { UserAvatar } from "../common/UserAvatar";
import { EmptyState } from "../common/EmptyState";
import { routes } from "../../config/routes";
import { isBeforeToday } from "../../utils/date";
import { rideSearchTitle } from "../../utils/rideSearch";
import { buildTrip, buildTrips, cosplayTripId, currentTripId, isTripOver } from "../../utils/trips";
import { matchSearchActions, type SearchActionId } from "../../utils/searchActions";
import type { RouteActionState } from "../../hooks/useRouteAction";

interface ResultRow {
  key: string;
  title: string;
  subtitle: string;
  to: string;
  /** Asks the page it lands on to open something (see `useRouteAction`). */
  state?: RouteActionState;
  /** Overrides the group's icon, for rows that each mean something different. */
  icon?: typeof CalendarDays;
}

const ACTION_ICONS: Record<SearchActionId, typeof CalendarDays> = {
  ping: MapPin,
  parking: Car,
  ride: Car,
  meal: Utensils,
  rooms: BedDouble,
  cosplay: Sparkles,
  photos: Camera,
  finance: Wallet,
};

interface ResultGroup {
  label: string;
  icon: typeof CalendarDays;
  rows: ResultRow[];
}

const MAX_PER_GROUP = 6;

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((f) => f && f.toLowerCase().includes(query));
}

function resolveDriverName(driver: string, users: { name: string; discord_username?: string; aliases?: string[] }[]) {
  return users.find((u) => u.name === driver || u.discord_username === driver || u.aliases?.includes(driver))?.name ?? driver;
}

/**
 * Full-screen search over everything already loaded into the app — trips,
 * rides, activiteiten, cosplays and crew — filtered client-side against the
 * query caches the rest of the app already keeps warm, so opening this never
 * fires a request of its own.
 *
 * Besides data it finds things to *do* ("Acties": ping your location, make a
 * ride…). Those that belong to a trip act on the current one — the same trip the
 * Event tab opens on — and say so under the card, so it is never a surprise
 * which event a new ride or meal ends up on.
 */
/** What the empty search offers to try: things people look for, each of which has a card of its own. */
const EXAMPLES = ["Locatie pingen", "Rit aanmaken", "Parkeerplek"];

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: events = [] } = useCalendar();
  const { data: rides = [] } = useRides();
  const { data: meals = [] } = useMeals();
  const { data: cosplays = [] } = useCosplays();
  const { data: users = [] } = useUsers();

  const groups = useMemo<ResultGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const trips = buildTrips(events).filter((t) => matches(q, t.title, t.location));
    // Old rides would bury the ones that matter: only today and later are found here.
    const rideRows = rides.filter((r) =>
      !isBeforeToday(r.departure_time) && matches(q, resolveDriverName(r.driver, users), r.start_location, r.end_location),
    );
    const mealRows = meals.filter((m) => matches(q, m.meal_name, m.location));
    const cosplayRows = cosplays.filter((c) => matches(q, c.character_name, c.series, c.user_name));
    const crewRows = users.filter((u) => u.id && matches(q, u.name, u.discord_username));

    const out: ResultGroup[] = [];

    const tripId = currentTripId(events);
    const currentTrip = tripId ? buildTrip(events, tripId) : null;
    const actions = matchSearchActions(q, {
      hasTrip: !!currentTrip,
      tripOver: currentTrip ? isTripOver(currentTrip) : false,
      hasHotel: !!currentTrip?.isHotel,
      hasCon: !!currentTrip?.hasCon,
    });
    if (actions.length) {
      out.push({
        label: "Acties",
        icon: Zap,
        rows: actions.map((a) => {
          const forTrip = a.needsTrip && currentTrip ? ` · ${currentTrip.title}` : "";
          let to: string = routes.finance;
          if (a.id === "ping" || a.id === "parking") to = routes.crew;
          else if (currentTrip) {
            to =
              a.id === "ride" ? routes.trip.view(currentTrip.id, "transport")
              : a.id === "meal" ? routes.trip.view(currentTrip.id)
              : a.id === "rooms" ? routes.trip.view(currentTrip.id, "rooms")
              : a.id === "cosplay" ? routes.trip.view(currentTrip.id, "cosplay")
              : a.id === "photos" ? routes.trip.view(currentTrip.id, "photos")
              : routes.finance;
          }
          return {
            key: `action-${a.id}`,
            title: a.label,
            subtitle: `${a.hint}${forTrip}`,
            to,
            state: a.route ? { action: a.route } : undefined,
            icon: ACTION_ICONS[a.id],
          };
        }),
      });
    }

    if (trips.length) {
      out.push({
        label: "Evenementen",
        icon: CalendarDays,
        rows: trips.slice(0, MAX_PER_GROUP).map((t) => ({
          key: t.id,
          title: t.title,
          subtitle: [t.dateRange, t.location].filter(Boolean).join(" · "),
          to: routes.trip.view(t.id),
        })),
      });
    }
    if (rideRows.length) {
      out.push({
        label: "Ritten",
        icon: Car,
        rows: rideRows.slice(0, MAX_PER_GROUP).map((r) => ({
          key: r.id,
          title: rideSearchTitle(r, meals, resolveDriverName(r.driver, users)),
          subtitle: [r.start_location, r.end_location].filter(Boolean).join(" → "),
          to: routes.ride.view(r.id),
        })),
      });
    }
    if (mealRows.length) {
      out.push({
        label: "Activiteiten",
        icon: Utensils,
        rows: mealRows.slice(0, MAX_PER_GROUP).map((m) => ({
          key: m.id,
          title: m.meal_name,
          subtitle: m.location,
          to: routes.meal.view(m.id),
        })),
      });
    }
    if (cosplayRows.length) {
      out.push({
        label: "Cosplays",
        icon: Sparkles,
        rows: cosplayRows
          .map((c) => {
            // A concert has no Cosplay sheet, so a cosplay linked only to one is not offered.
            const tripId = cosplayTripId(events, c.linked_event_ids);
            return tripId
              ? {
                  key: c.id,
                  title: c.character_name,
                  subtitle: [c.series, c.user_name].filter(Boolean).join(" · "),
                  to: routes.trip.view(tripId, "cosplay"),
                }
              : null;
          })
          .filter((r): r is ResultRow => r !== null)
          .slice(0, MAX_PER_GROUP),
      });
    }
    if (crewRows.length) {
      out.push({
        label: "Crew",
        icon: Users,
        rows: crewRows.slice(0, MAX_PER_GROUP).map((u) => ({
          key: u.id!,
          title: u.name,
          subtitle: u.discord_username ? `@${u.discord_username}` : "",
          to: routes.profile.view(u.id!),
        })),
      });
    }
    return out.filter((g) => g.rows.length > 0);
  }, [query, events, rides, meals, cosplays, users]);

  // Give focus back to what opened the search when it closes. The opener is read while rendering the opening:
  // by the time an effect runs, the search box has already taken the focus.
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) openerRef.current = document.activeElement as HTMLElement | null;
  wasOpen.current = open;
  useEffect(() => {
    if (!open) return;
    return () => openerRef.current?.focus?.();
  }, [open]);

  function go(to: string, state?: RouteActionState) {
    setQuery("");
    onClose();
    navigate(to, state ? { state } : undefined);
  }

  function handleClose() {
    setQuery("");
    onClose();
  }

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const hasResults = groups.length > 0;

  // In a portal: the header is a stacking context of its own, which would keep this under the tab bar.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zoeken"
      onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
      className="fixed inset-0 z-[450] flex flex-col bg-paper"
      style={{ paddingTop: "env(safe-area-inset-top,0px)" }}
    >
      <div className="flex shrink-0 items-center gap-2 border-b-1.5 border-line px-4 py-3">
        <Search size={16} className="shrink-0 text-ink-3" />
        <input
          ref={inputRef}
          autoFocus
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek in de app…"
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="button"
          onClick={handleClose}
          aria-label="Zoeken sluiten"
          className="icon-btn"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasQuery && (
          <div className="space-y-3 pt-8 text-center">
            <p className="text-sm text-ink-3">Zoek een evenement, rit, activiteit, cosplay of lid, of probeer:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => { setQuery(example); inputRef.current?.focus(); }} className="chip chip-off">
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
        {hasQuery && !hasResults && (
          <EmptyState compact icon={<Search size={22} />} title={`Niks gevonden voor “${query.trim()}”`} description="Controleer de spelling of zoek op iets anders." />
        )}
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="section-label mb-1.5 flex items-center gap-1.5">
                <group.icon size={12} />
                {group.label}
              </p>
              <div className="card-surface divide-y divide-line overflow-hidden">
                {group.rows.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => go(row.to, row.state)}
                    className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-sunken"
                  >
                    {group.label === "Crew" ? (
                      <UserAvatar name={row.title} className="h-8 w-8 shrink-0 text-[12px]" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-2">
                        {row.icon ? <row.icon size={14} /> : <group.icon size={14} />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{row.title}</span>
                      {row.subtitle && <span className="block truncate text-xs text-ink-3">{row.subtitle}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
