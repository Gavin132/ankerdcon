import { AlertTriangle, ArrowRight, ArrowLeft, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { avatarColor } from "../../utils/avatar";
import { formatDate, formatDateTime } from "../../utils/format";
import { parseRestaurantDrivers, getRideStatus } from "../../utils/rides";
import { listItem } from "../../utils/motion";
import type { CalendarEvent, Ride, Meal } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissingItem {
  name: string;
  items: string[];
}

export interface ActionAlert {
  date: string;
  eventName: string;
  missing: MissingItem[];
}

export interface RestaurantGap {
  rowNumber: number;
  location: string;
  departureTime: string;
  unassigned: string[];
}

// ─── Compute helpers ──────────────────────────────────────────────────────────

export function computeActionAlerts(
  events: CalendarEvent[],
  rides: Ride[],
  meals: Meal[],
): ActionAlert[] {
  return events
    .map((ev) => {
      const inbound = new Set(
        rides.filter((r) => r.direction === "Inbound").flatMap((r) => r.passengers.map((p) => p.toLowerCase())),
      );
      const outbound = new Set(
        rides.filter((r) => r.direction === "Outbound").flatMap((r) => r.passengers.map((p) => p.toLowerCase())),
      );
      const rsvps = new Set(meals.flatMap((m) => m.rsvps.map((r) => r.toLowerCase())));

      const missing = ev.participants
        .map((name) => {
          const lc = name.toLowerCase();
          const items: string[] = [];
          if (!inbound.has(lc)) items.push("Heen");
          if (!outbound.has(lc)) items.push("Terug");
          if (meals.length > 0 && !rsvps.has(lc)) items.push("Eten");
          return { name, items };
        })
        .filter((m) => m.items.length > 0);

      return { date: ev.date, eventName: ev.event_name, missing };
    })
    .filter((a) => a.missing.length > 0);
}

export function computeRestaurantGaps(rides: Ride[]): RestaurantGap[] {
  return rides
    .filter((r) => r.direction === "Restaurant")
    .flatMap((ride) => {
      const { status } = getRideStatus(ride.departure_time);
      if (status === "past") return [];
      const drivers     = parseRestaurantDrivers(ride.parking_info);
      const driverNames = new Set(drivers.map((d) => d.name));
      const assignedPax = new Set(drivers.flatMap((d) => d.passengers));
      const unassigned  = ride.passengers.filter((a) => !driverNames.has(a) && !assignedPax.has(a));
      if (unassigned.length === 0) return [];
      return [{ rowNumber: ride.row_number, location: ride.start_location, departureTime: ride.departure_time, unassigned }];
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CHIP_CONFIG: Record<string, { icon: React.ReactNode; cls: string }> = {
  Heen:  { icon: <ArrowRight size={10} />,     cls: "bg-sky-100 text-sky-700 border border-sky-200" },
  Terug: { icon: <ArrowLeft size={10} />,      cls: "bg-indigo-100 text-indigo-700 border border-indigo-200" },
  Eten:  { icon: <UtensilsCrossed size={10} />, cls: "bg-amber-100 text-amber-700 border border-amber-200" },
};

function MissingChip({ label }: { label: string }) {
  const cfg = CHIP_CONFIG[label] ?? { icon: null, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon}
      {label}
    </span>
  );
}

function EventAlertBlock({ alert }: { alert: ActionAlert }) {
  return (
    <CollapsibleSection
      defaultOpen={false}
      className="border-b border-slate-100 dark:border-slate-800 last:border-0"
      titleClassName="py-2.5 px-4"
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{alert.eventName}</span>
          <span className="shrink-0 text-xs text-slate-400">{formatDate(alert.date)}</span>
          <span className="ml-auto mr-2 shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            {alert.missing.length}
          </span>
        </div>
      }
    >
      <div className="space-y-2 px-4 pb-3">
        {alert.missing.map(({ name, items }) => (
          <div key={name} className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${avatarColor(name)}`}>
              {name[0].toUpperCase()}
            </div>
            <span className="w-20 shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-200 truncate capitalize">{name}</span>
            <div className="flex flex-wrap gap-1">
              {items.map((i) => <MissingChip key={i} label={i} />)}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

function RestaurantGapBlock({ gap }: { gap: RestaurantGap }) {
  const navigate = useNavigate();
  return (
    <CollapsibleSection
      defaultOpen={false}
      className="border-b border-slate-100 dark:border-slate-800 last:border-0"
      titleClassName="py-2.5 px-4"
      title={
        <div className="flex items-center gap-2 min-w-0">
          <UtensilsCrossed size={12} className="shrink-0 text-amber-500" />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{gap.location}</span>
          <span className="shrink-0 text-xs text-slate-400">{formatDateTime(gap.departureTime)}</span>
          <span className="ml-auto mr-2 shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-100 px-1.5 text-xs font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
            {gap.unassigned.length}
          </span>
        </div>
      }
    >
      <div className="px-4 pb-3 space-y-2">
        <p className="text-xs text-slate-400">Nog geen rit toegewezen:</p>
        {gap.unassigned.map((name) => (
          <div key={name} className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${avatarColor(name)}`}>
              {name[0].toUpperCase()}
            </div>
            <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{name}</span>
          </div>
        ))}
        <button
          onClick={() => navigate("/transport", { state: { tab: "Restaurant" } })}
          className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors dark:text-amber-400"
        >
          <ArrowRight size={12} />
          Bekijk restaurant transport
        </button>
      </div>
    </CollapsibleSection>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DailyActionCheckProps {
  alerts: ActionAlert[];
  restaurantGaps?: RestaurantGap[];
}

export function DailyActionCheck({ alerts, restaurantGaps = [] }: DailyActionCheckProps) {
  if (alerts.length === 0 && restaurantGaps.length === 0) return null;

  const totalMissing = alerts.reduce((s, a) => s + a.missing.length, 0) + restaurantGaps.length;

  return (
    <motion.div variants={listItem}>
      <CollapsibleSection
        defaultOpen
        titleClassName="mb-3"
        title={
          <span className="section-label flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-500" />
            Actie vereist ({totalMissing})
          </span>
        }
      >
        <div className="card-surface rounded-2xl overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">
          {alerts.map((alert) => (
            <EventAlertBlock key={alert.date + alert.eventName} alert={alert} />
          ))}
          {restaurantGaps.map((gap) => (
            <RestaurantGapBlock key={gap.rowNumber} gap={gap} />
          ))}
        </div>
      </CollapsibleSection>
    </motion.div>
  );
}
