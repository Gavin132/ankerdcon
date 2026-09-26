import { Link, NavLink, useLocation } from "react-router-dom";
import { APP_NAME, NAV_ITEMS, isNavItemActive } from "../../constants";
import { routes } from "../../config/routes";
import { useCalendar } from "../../hooks/useCalendar";
import { useTimeStore } from "../../store/time.store";
import { daysBetween, toDateKey, todayKey } from "../../utils/date";
import { getGroupTitle } from "../../utils/multiDay";
import { buildTrip, currentTripId } from "../../utils/trips";
import { AccountMenu } from "./AccountMenu";
import { TimeTravelControl } from "../common/TimeTravelWidget";

/**
 * The next (or current) trip as a small brand-blue wristband above the nav: name,
 * dates and a countdown. Links to the trip's Event page.
 */
function TripWristband() {
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const { data: events = [] } = useCalendar();
  const tripId = currentTripId(events);
  const trip = tripId ? buildTrip(events, tripId) : null;
  if (!trip) return null;

  const today = todayKey();
  const untilStart = daysBetween(today, toDateKey(trip.days[0].date));
  const countdown =
    untilStart > 0
      ? { big: String(untilStart), small: untilStart === 1 ? "dag" : "dagen" }
      : { big: "Nu", small: "bezig" };

  return (
    <Link
      to={routes.trip.view(trip.id)}
      className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 overflow-hidden rounded-[10px] border-2 border-outline bg-brand px-3 py-2.5 text-brand-on"
    >
      {/* Punched holes on both short edges */}
      <span aria-hidden className="absolute -left-[7px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-outline bg-surface" />
      <span aria-hidden className="absolute -right-[7px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-outline bg-surface" />
      <span className="min-w-0 pl-1">
        <span className="block font-mono text-[10px] uppercase tracking-[0.08em] opacity-75">{trip.dateRange}</span>
        <span className="block truncate font-display text-[19px] font-extrabold uppercase leading-none">{getGroupTitle(trip.days)}</span>
      </span>
      <span className="pr-1 text-right leading-none">
        <span className="block font-display text-[28px] font-black leading-[0.9]">{countdown.big}</span>
        <span className="block font-mono text-[9px] uppercase tracking-[0.06em]">{countdown.small}</span>
      </span>
    </Link>
  );
}

/**
 * Desktop navigation: an icon rail on tablets (md) and a full sidebar with
 * the trip wristband and account menu from lg. Phones use BottomNav instead.
 */
export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col gap-5 border-r-1.5 border-line bg-surface px-2.5 py-4 pl-[max(0.625rem,env(safe-area-inset-left,0px))] md:flex lg:w-60 lg:px-3.5 lg:py-5">
      <Link to={routes.hub} className="flex items-center justify-center gap-2.5 lg:justify-start lg:px-1.5">
        <img src="/icons/icon-192.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
        <span className="hidden font-display text-[24px] font-black uppercase leading-none tracking-[0.02em] text-ink lg:block">
          {APP_NAME}
        </span>
      </Link>

      <div className="hidden lg:block">
        <TripWristband />
      </div>

      <nav className="flex flex-col gap-0.5" aria-label="Hoofdmenu">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item, pathname);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center gap-2.5 rounded-lg p-2.5 text-[14px] font-medium transition-colors lg:justify-start lg:px-2.5 lg:py-2 ${
                active
                  ? "bg-[rgb(var(--nav-active-bg))] text-[rgb(var(--nav-active-fg))]"
                  : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              <Icon
                size={19}
                strokeWidth={active ? 2.4 : 2}
                className={`shrink-0 lg:h-4 lg:w-4 ${active ? "text-brand dark:text-brand-on" : ""}`}
              />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <TimeTravelControl variant="sidebar" />
        <div className="hidden border-t-1.5 border-line pt-3 lg:block">
          <AccountMenu variant="row" />
        </div>
      </div>
    </aside>
  );
}
