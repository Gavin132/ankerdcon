import { AlertCircle, Lock, Package, ParkingCircle } from "lucide-react";
import { SectionLabel } from "../common/SectionLabel";
import type { CalendarEvent } from "../../types";

interface PracticalItem {
  icon: React.ElementType;
  label: string;
  content: string;
  color: "sky" | "violet" | "emerald" | "amber";
  alert: boolean;
}

function buildItems(event: CalendarEvent): PracticalItem[] {
  return [
    event.parking_info         && { icon: ParkingCircle, label: "Parkeren",     content: event.parking_info,         color: "sky"     as const, alert: false },
    event.what_to_bring        && { icon: Package,       label: "Wat meenemen", content: event.what_to_bring,        color: "violet"  as const, alert: false },
    event.locker_info          && { icon: Lock,          label: "Lockers",      content: event.locker_info,          color: "emerald" as const, alert: false },
    event.special_instructions && { icon: AlertCircle,   label: "Let op",       content: event.special_instructions, color: "amber"   as const, alert: true  },
  ].filter(Boolean) as PracticalItem[];
}

const COLOR_MAP = {
  sky:     { bg: "bg-sky-100 dark:bg-sky-500/10",       icon: "text-sky-600 dark:text-sky-400",       bar: "from-sky-400 to-blue-500"      },
  violet:  { bg: "bg-violet-100 dark:bg-violet-500/10", icon: "text-violet-600 dark:text-violet-400", bar: "from-violet-400 to-purple-500"  },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", bar: "from-emerald-400 to-teal-500" },
  amber:   { bg: "bg-amber-100 dark:bg-amber-500/10",   icon: "text-amber-600 dark:text-amber-400",   bar: "from-amber-400 to-orange-500"   },
};

function PracticalCard({ icon: Icon, label, content, color, alert }: PracticalItem) {
  const cls = COLOR_MAP[color];

  if (alert) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/[0.07] overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-500" />
        <div className="flex items-start gap-3 px-4 py-4">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls.bg}`}>
            <Icon size={14} className={cls.icon} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70 dark:text-amber-400/60 mb-1.5">
              {label}
            </p>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-300 leading-relaxed whitespace-pre-line">
              {content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <div className={`h-[3px] bg-gradient-to-r ${cls.bar}`} />
      <div className="flex items-start gap-3 px-4 py-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls.bg}`}>
          <Icon size={14} className={cls.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
            {label}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

interface EventPracticalProps {
  event: CalendarEvent;
}

export function EventPractical({ event }: EventPracticalProps) {
  const items = buildItems(event);
  if (items.length === 0) return null;

  const regular = items.filter((r) => !r.alert);
  const alerts  = items.filter((r) => r.alert);

  return (
    <div className="space-y-3">
      <SectionLabel>Praktische info</SectionLabel>

      {/* Alert items — full width */}
      {alerts.map((item, i) => (
        <PracticalCard key={i} {...item} />
      ))}

      {/* Regular items — responsive grid */}
      {regular.length > 0 && (
        <div className={`grid gap-3 ${
          regular.length === 1 ? "grid-cols-1" :
          regular.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}>
          {regular.map((item, i) => (
            <PracticalCard key={i} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
