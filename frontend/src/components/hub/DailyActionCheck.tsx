import { AlertTriangle, ArrowRight, ArrowLeft, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { avatarColor } from "../../utils/avatar";
import { formatDate } from "../../utils/format";
import { listItem } from "../../utils/motion";
import type { CalendarEvent, Ride, Meal } from "../../types";

interface MissingItem {
  name: string;
  items: string[];
}

export interface ActionAlert {
  date: string;
  eventName: string;
  missing: MissingItem[];
}

const CHIP_CONFIG: Record<string, { icon: React.ReactNode; cls: string }> = {
  Heen: {
    icon: <ArrowRight size={10} />,
    cls: "bg-sky-100 text-sky-700 border border-sky-200",
  },
  Terug: {
    icon: <ArrowLeft size={10} />,
    cls: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  },
  Eten: {
    icon: <UtensilsCrossed size={10} />,
    cls: "bg-amber-100 text-amber-700 border border-amber-200",
  },
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
      className="border-b border-slate-100 last:border-0"
      titleClassName="py-2.5 px-4"
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm text-slate-800 truncate">{alert.eventName}</span>
          <span className="shrink-0 text-xs text-slate-400">{formatDate(alert.date)}</span>
          <span className="ml-auto mr-2 shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-700">
            {alert.missing.length}
          </span>
        </div>
      }
    >
      <div className="space-y-2 px-4 pb-3">
        {alert.missing.map(({ name, items }) => (
          <div key={name} className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-black text-white ${avatarColor(name)}`}
            >
              {name[0].toUpperCase()}
            </div>
            <span className="w-20 shrink-0 text-sm font-semibold text-slate-800 truncate capitalize">
              {name}
            </span>
            <div className="flex flex-wrap gap-1">
              {items.map((i) => (
                <MissingChip key={i} label={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

export function computeActionAlerts(
  events: CalendarEvent[],
  rides: Ride[],
  meals: Meal[],
): ActionAlert[] {
  return events
    .map((ev) => {
      const inbound = new Set(
        rides
          .filter((r) => r.direction === "Inbound")
          .flatMap((r) => r.passengers.map((p) => p.toLowerCase())),
      );
      const outbound = new Set(
        rides
          .filter((r) => r.direction === "Outbound")
          .flatMap((r) => r.passengers.map((p) => p.toLowerCase())),
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

interface DailyActionCheckProps {
  alerts: ActionAlert[];
}

export function DailyActionCheck({ alerts }: DailyActionCheckProps) {
  if (alerts.length === 0) return null;
  const totalMissing = alerts.reduce((s, a) => s + a.missing.length, 0);

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
        <div className="card-surface rounded-2xl overflow-hidden divide-y divide-slate-50">
          {alerts.map((alert) => (
            <EventAlertBlock key={alert.date + alert.eventName} alert={alert} />
          ))}
        </div>
      </CollapsibleSection>
    </motion.div>
  );
}
