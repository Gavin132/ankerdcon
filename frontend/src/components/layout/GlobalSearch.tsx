import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, CalendarDays, Car, Utensils, Sparkles, Users } from "lucide-react";
import { useCalendar } from "../../hooks/useCalendar";
import { useRides } from "../../hooks/useRides";
import { useMeals } from "../../hooks/useMeals";
import { useCosplays } from "../../hooks/useCosplays";
import { useUsers } from "../../hooks/useUsers";
import { UserAvatar } from "../common/UserAvatar";
import { routes } from "../../config/routes";
import { buildTrips, tripIdForEvent } from "../../utils/trips";

interface ResultRow {
  key: string;
  title: string;
  subtitle: string;
  to: string;
}

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
 * rides, maaltijden, cosplays and crew — filtered client-side against the
 * query caches the rest of the app already keeps warm, so opening this never
 * fires a request of its own.
 */
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
    const rideRows = rides.filter((r) =>
      matches(q, resolveDriverName(r.driver, users), r.start_location, r.end_location),
    );
    const mealRows = meals.filter((m) => matches(q, m.meal_name, m.location));
    const cosplayRows = cosplays.filter((c) => matches(q, c.character_name, c.series, c.user_name));
    const crewRows = users.filter((u) => u.id && matches(q, u.name, u.discord_username));

    const out: ResultGroup[] = [];
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
          title: resolveDriverName(r.driver, users),
          subtitle: [r.start_location, r.end_location].filter(Boolean).join(" → "),
          to: routes.ride.view(r.id),
        })),
      });
    }
    if (mealRows.length) {
      out.push({
        label: "Maaltijden",
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
            const tripId = c.linked_event_ids[0] ? tripIdForEvent(events, c.linked_event_ids[0]) : null;
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

  function go(to: string) {
    setQuery("");
    onClose();
    navigate(to);
  }

  function handleClose() {
    setQuery("");
    onClose();
  }

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const hasResults = groups.length > 0;

  return (
    <div className="fixed inset-0 z-[450] flex flex-col bg-paper" style={{ paddingTop: "env(safe-area-inset-top,0px)" }}>
      <div className="flex shrink-0 items-center gap-2 border-b-1.5 border-line px-4 py-3">
        <Search size={16} className="shrink-0 text-ink-3" />
        <input
          ref={inputRef}
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek events, ritten, maaltijden, cosplays, crew…"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="button"
          onClick={handleClose}
          aria-label="Zoeken sluiten"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasQuery && (
          <p className="pt-10 text-center text-sm text-ink-3">Typ om te zoeken.</p>
        )}
        {hasQuery && !hasResults && (
          <p className="pt-10 text-center text-sm text-ink-3">Niks gevonden voor "{query.trim()}".</p>
        )}
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                <group.icon size={12} />
                {group.label}
              </p>
              <div className="space-y-1">
                {group.rows.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => go(row.to)}
                    className="card-surface-hover flex w-full items-center gap-3 p-3 text-left"
                  >
                    {group.label === "Crew" ? (
                      <UserAvatar name={row.title} className="h-8 w-8 shrink-0 text-[11px]" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-2">
                        <group.icon size={14} />
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
    </div>
  );
}
