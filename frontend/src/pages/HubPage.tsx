import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Bus,
  UtensilsCrossed,
  Wallet,
  BedDouble,
  Users,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { CollapsibleSection } from "../components/common/CollapsibleSection";
import { LocationPingDisplay } from "../components/common/LocationPingDisplay";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useMeals } from "../hooks/useMeals";
import { usePayments } from "../hooks/usePayments";
import { useUsers } from "../hooks/useUsers";
import { formatDate } from "../utils/format";
import { avatarColor } from "../utils/avatar";
import type { CalendarEvent, Ride, Meal, User } from "../types";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// ─── Action-check types & compute ──────────────────────────────────────────

interface MissingItem {
  name: string;
  items: string[];
}

interface ActionAlert {
  date: string;
  eventName: string;
  missing: MissingItem[];
}

function computeActionAlerts(
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
      const rsvps = new Set(
        meals.flatMap((m) => m.rsvps.map((r) => r.toLowerCase())),
      );

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

// ─── Missing chip ───────────────────────────────────────────────────────────

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
  const cfg = CHIP_CONFIG[label] ?? {
    icon: null,
    cls: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.icon}
      {label}
    </span>
  );
}

// ─── Per-event alert block ──────────────────────────────────────────────────

function EventAlertBlock({ alert }: { alert: ActionAlert }) {
  return (
    <CollapsibleSection
      defaultOpen={false}
      className="border-b border-slate-100 last:border-0"
      titleClassName="py-2.5 px-4"
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm text-slate-800 truncate">
            {alert.eventName}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            {formatDate(alert.date)}
          </span>
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

// ─── DailyActionCheck ───────────────────────────────────────────────────────

function DailyActionCheck({ alerts }: { alerts: ActionAlert[] }) {
  if (alerts.length === 0) return null;
  const totalMissing = alerts.reduce((s, a) => s + a.missing.length, 0);

  return (
    <motion.div variants={item}>
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

// ─── StatCard ───────────────────────────────────────────────────────────────

interface StatCardProps {
  gradient: string;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  onClick?: () => void;
}

function StatCard({ gradient, icon, value, label, onClick }: StatCardProps) {
  return (
    <motion.button
      variants={item}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-5 text-left shadow-stat ${gradient} ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
      whileHover={onClick ? { y: -2, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            {icon}
          </div>
          {onClick && (
            <ArrowRight
              size={14}
              className="text-white/50 group-hover:text-white/80 transition-colors"
            />
          )}
        </div>
        <div className="text-3xl font-black text-white leading-none">
          {value}
        </div>
        <div className="mt-1 text-xs font-semibold text-white/70 uppercase tracking-widest">
          {label}
        </div>
      </div>
    </motion.button>
  );
}

// ─── CrewSection ────────────────────────────────────────────────────────────

const CREW_INITIAL = 5;

function CrewSection({ users }: { users: User[] }) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  const isSearching = query.length > 0;
  const visible =
    isSearching || showAll ? filtered : filtered.slice(0, CREW_INITIAL);
  const remaining = users.length - CREW_INITIAL;

  return (
    <motion.div variants={item}>
      <CollapsibleSection
        defaultOpen
        titleClassName="mb-3"
        title={<span className="section-label">Crew ({users.length})</span>}
      >
        {/* Search */}
        <div className="relative mb-2">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input-field py-2 pl-8 text-sm"
            placeholder="Wie zoek je?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="card-surface rounded-2xl divide-y divide-slate-50 overflow-hidden">
          {visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              Geen resultaten voor &ldquo;{query}&rdquo;
            </p>
          ) : (
            visible.map((u) => (
              <div key={u.name} className="flex items-center gap-3 px-4 py-3.5">
                <div
                  className={`avatar h-10 w-10 rounded-xl bg-gradient-to-br text-sm ${avatarColor(u.name)} shadow-sm`}
                >
                  {u.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 capitalize">
                    {u.name}
                  </p>
                  {u.hotel_room && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <BedDouble size={11} />
                      Kamer {u.hotel_room}
                    </span>
                  )}
                </div>
                {u.live_location_ping && (
                  <LocationPingDisplay raw={u.live_location_ping} />
                )}
              </div>
            ))
          )}

          {!isSearching && users.length > CREW_INITIAL && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 py-3 text-sm font-semibold text-sky-600 hover:bg-sky-50 transition-colors"
            >
              {showAll ? (
                <>
                  Minder tonen <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Toon {remaining} meer <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </CollapsibleSection>
    </motion.div>
  );
}

// ─── HubPage ────────────────────────────────────────────────────────────────

export function HubPage() {
  const navigate = useNavigate();
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const { data: events, isLoading: evLoading } = useCalendar();
  const { data: rides } = useRides();
  const { data: meals } = useMeals();
  const { data: payments } = usePayments();
  const { data: users } = useUsers();

  if (evLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalSpend = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const event = events?.[0];
  const actionAlerts = computeActionAlerts(
    events ?? [],
    rides ?? [],
    meals ?? [],
  );

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Hero event card */}
      <motion.div variants={item}>
        {event ? (
          <div className="relative overflow-hidden rounded-3xl gradient-hero shadow-hero">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-sky-400/10" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute top-4 right-4 h-64 w-64 rounded-full bg-sky-600/10 blur-2xl" />

            <div className="relative p-6">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-400/20 px-3 py-1.5 backdrop-blur-sm border border-sky-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-xs font-bold text-sky-300 uppercase tracking-widest">
                  Aankomend evenement
                </span>
              </div>

              <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                {event.event_name}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-sky-200">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-sky-400" />
                  {formatDate(event.date)}
                </span>
                {event.is_hotel && (
                  <span className="flex items-center gap-1.5">
                    <BedDouble size={14} className="text-sky-400" />
                    Hotel inbegrepen
                  </span>
                )}
              </div>

              {event.participants.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setParticipantsExpanded((v) => !v)}
                    className="flex items-center gap-2 text-left"
                  >
                    <div className="flex -space-x-2">
                      {event.participants.slice(0, 5).map((p) => (
                        <div
                          key={p}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0F3D5A] bg-gradient-to-br ${avatarColor(p)} text-xs font-bold text-white`}
                          title={p}
                        >
                          {p[0].toUpperCase()}
                        </div>
                      ))}
                      {event.participants.length > 5 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0F3D5A] bg-white/20 text-xs font-bold text-white">
                          +{event.participants.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-sky-300/80">
                      {participantsExpanded ? "Verbergen" : `${event.participants.length} deelnemers`}
                    </span>
                  </button>

                  <AnimatePresence>
                    {participantsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {event.participants.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 rounded-full bg-sky-400/20 border border-sky-400/30 px-2.5 py-1 text-xs font-semibold text-sky-200"
                            >
                              <span
                                className={`h-4 w-4 rounded-full bg-gradient-to-br ${avatarColor(p)} flex items-center justify-center text-xs font-black text-white`}
                                style={{ fontSize: "9px" }}
                              >
                                {p[0].toUpperCase()}
                              </span>
                              {p}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl gradient-hero shadow-hero p-6">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-sky-400/10" />
            <div className="relative">
              <div className="mb-2 text-sky-400/60 text-sm font-semibold uppercase tracking-widest">
                Welkom
              </div>
              <h2 className="text-2xl font-black text-white">
                Ankerd Con Portal
              </h2>
              <p className="mt-2 text-sm text-sky-300/80">
                Verbinding maken met de spreadsheet...
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Daily action check */}
      <DailyActionCheck alerts={actionAlerts} />

      {/* Stats grid */}
      <motion.div variants={item}>
        <p className="section-label mb-3">Overzicht</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            gradient="bg-gradient-to-br from-sky-500 to-blue-600"
            icon={<Bus size={18} className="text-white" />}
            value={(rides ?? []).length}
            label="Ritten"
            onClick={() => navigate("/transport")}
          />
          <StatCard
            gradient="bg-gradient-to-br from-cyan-400 to-sky-500"
            icon={<UtensilsCrossed size={18} className="text-white" />}
            value={(meals ?? []).length}
            label="Maaltijden"
            onClick={() => navigate("/food")}
          />
          <StatCard
            gradient="bg-gradient-to-br from-blue-600 to-blue-800"
            icon={<Wallet size={18} className="text-white" />}
            value={`€${totalSpend.toFixed(0)}`}
            label="Uitgaven"
            onClick={() => navigate("/finance")}
          />
          <StatCard
            gradient="bg-gradient-to-br from-sky-400 to-blue-500"
            icon={<Users size={18} className="text-white" />}
            value={(users ?? []).length}
            label="Leden"
          />
        </div>
      </motion.div>

      {/* Crew roster */}
      {(users ?? []).length > 0 && <CrewSection users={users ?? []} />}
    </motion.div>
  );
}
