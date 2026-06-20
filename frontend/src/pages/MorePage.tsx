import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  LogOut,
  BedDouble,
  Phone,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Navigation,
  CalendarDays,
  Users,
  Search,
  Archive,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Badge } from "../components/common/Badge";
import { LocationPingDisplay } from "../components/common/LocationPingDisplay";
import { useUsers, usePingLocation } from "../hooks/useUsers";
import { useCalendar } from "../hooks/useCalendar";
import { useAuthStore } from "../store/auth.store";
import { logout } from "../services/auth.service";
import { useNavigate } from "react-router-dom";
import { avatarColor } from "../utils/avatar";
import type { CalendarEvent } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ZONES = ["Op locatie", "Hotel", "Onderweg", "Off-site", "Thuis"] as const;
const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const pingSchema = z.object({
  user_name: z.string().min(1, "Verplicht"),
  zone: z.string().min(1, "Selecteer een zone"),
  text: z.string().min(1, "Voer details in"),
});
type PingForm = z.infer<typeof pingSchema>;

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function parseEventDate(str: string): Date | null {
  if (!str) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  // DD-MM-YYYY or D-M-YYYY
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayKey(): string {
  return toKey(new Date());
}

// ---------------------------------------------------------------------------
// Calendar grid component
// ---------------------------------------------------------------------------

function CalendarGrid({ events }: { events: CalendarEvent[] }) {
  // Build event map keyed by YYYY-MM-DD
  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const d = parseEventDate(ev.date);
      if (!d) continue;
      const key = toKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  // Default to first upcoming month with events, else current month
  const [currentMonth, setCurrentMonth] = useState<{
    year: number;
    month: number;
  }>(() => {
    const today = new Date();
    const keys = Object.keys(eventMap).sort();
    const futureKey = keys.find((k) => k >= toKey(today));
    if (futureKey) {
      const d = new Date(futureKey + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { year, month } = currentMonth;
  const monthLabel = new Date(year, month, 1).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayKey();
  const selectedEvents = selectedDate ? (eventMap[selectedDate] ?? []) : [];

  function prevMonth() {
    setCurrentMonth(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
    setSelectedDate(null);
  }
  function nextMonth() {
    setCurrentMonth(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
    setSelectedDate(null);
  }

  // Count events in current month
  const monthEventCount = Object.entries(eventMap)
    .filter(([key]) => {
      const d = new Date(key + "T00:00:00");
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((acc, [, evs]) => acc + evs.length, 0);

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-50">
        <button
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-slate-800 capitalize">
            {monthLabel}
          </p>
          {monthEventCount > 0 && (
            <p className="text-xs text-sky-500 font-semibold mt-0.5">
              {monthEventCount} {monthEventCount === 1 ? "event" : "events"}
            </p>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="px-3 py-3">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-bold text-slate-300 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="h-10" />;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasEvents = !!eventMap[dateKey]?.length;
            const isSelected = selectedDate === dateKey;
            const isToday = today === dateKey;
            const eventCount = eventMap[dateKey]?.length ?? 0;

            return (
              <button
                key={i}
                onClick={() =>
                  hasEvents && setSelectedDate(isSelected ? null : dateKey)
                }
                disabled={!hasEvents}
                className={[
                  "relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition-all",
                  isSelected
                    ? "bg-sky-500 text-white shadow-sm font-black"
                    : hasEvents
                      ? "text-sky-700 font-black hover:bg-sky-50 cursor-pointer"
                      : "text-slate-300 font-medium cursor-default",
                  isToday && !isSelected
                    ? "ring-2 ring-sky-400 ring-offset-1"
                    : "",
                ].join(" ")}
              >
                <span className="leading-none">{day}</span>
                {hasEvents && !isSelected && (
                  <span className="mt-0.5 flex gap-0.5">
                    {Array.from({ length: Math.min(eventCount, 3) }).map(
                      (_, j) => (
                        <span
                          key={j}
                          className="h-1 w-1 rounded-full bg-sky-400"
                        />
                      ),
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        <AnimatePresence>
          {selectedDate && selectedEvents.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.event_id}
                    className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-brand">
                        <CalendarDays size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-900 text-sm leading-tight">
                            {ev.event_name}
                          </p>
                          {ev.is_hotel && (
                            <Badge variant="violet">
                              <BedDouble size={10} />
                              Hotel
                            </Badge>
                          )}
                        </div>
                        {ev.participants.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ev.participants.map((p) => (
                              <Badge key={p} variant="blue">
                                <Users size={10} />
                                {p}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Archive — past events grouped by year
// ---------------------------------------------------------------------------

function CalendarArchive({ events }: { events: CalendarEvent[] }) {
  const [open, setOpen] = useState(false);

  const today = todayKey();
  const sorted = events
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter(({ date }) => date !== null)
    .sort((a, b) => b.date!.getTime() - a.date!.getTime());

  if (sorted.length === 0) return null;

  // Group by year
  const byYear = new Map<number, typeof sorted>();
  for (const entry of sorted) {
    const yr = entry.date!.getFullYear();
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr)!.push(entry);
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between mb-3 group"
      >
        <p className="section-label flex items-center gap-2">
          <Archive size={13} className="text-slate-400" />
          Alle evenementen ({sorted.length})
        </p>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 group-hover:text-slate-600 transition-colors"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {Array.from(byYear.entries()).map(([year, entries]) => (
                <div key={year}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                    {year}
                  </p>
                  <div className="card-surface rounded-2xl divide-y divide-slate-50 overflow-hidden">
                    {entries.map(({ ev, date }) => {
                      const isPast = toKey(date!) < today;
                      return (
                      <div
                        key={ev.event_id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isPast ? "bg-slate-100" : "gradient-brand"}`}>
                          <CalendarDays size={14} className={isPast ? "text-slate-400" : "text-white"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isPast ? "text-slate-400" : "text-slate-800"}`}>
                            {ev.event_name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {ev.date}
                            {ev.is_hotel && " · Hotel"}
                          </p>
                        </div>
                        {ev.participants.length > 0 && (
                          <div className="flex -space-x-1.5 shrink-0">
                            {ev.participants.slice(0, 4).map((p) => (
                              <div
                                key={p}
                                title={p}
                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-xs font-black text-white ${avatarColor(p)}`}
                              >
                                {p[0]}
                              </div>
                            ))}
                            {ev.participants.length > 4 && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-bold text-slate-500">
                                +{ev.participants.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MorePage
// ---------------------------------------------------------------------------

export function MorePage() {
  const [pingOpen, setPingOpen] = useState(false);
  const [crewExpanded, setCrewExpanded] = useState(false);
  const [crewQuery, setCrewQuery] = useState("");

  const { data: users, isLoading } = useUsers();
  const { data: calendarEvents } = useCalendar();
  const pingMutation = usePingLocation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PingForm>({ resolver: zodResolver(pingSchema) });

  async function onPing(values: PingForm) {
    await pingMutation.mutateAsync(values);
    reset({});
    setPingOpen(false);
  }

  async function onLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  const allUsers = users ?? [];
  const filteredUsers = crewQuery
    ? allUsers.filter((u) =>
        u.name.toLowerCase().includes(crewQuery.toLowerCase()),
      )
    : allUsers;

  return (
    <motion.div
      className="space-y-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Live locatie */}
      <motion.div variants={item}>
        <p className="section-label mb-3">Live locatie</p>
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            onClick={() => setPingOpen(true)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand">
              <Navigation size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">Locatie pingen</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Stuur je locatie naar de groep
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        </div>
      </motion.div>

      {/* Con Calendar */}
      {(calendarEvents ?? []).length > 0 && (
        <motion.div variants={item}>
          <p className="section-label mb-3 flex items-center gap-2">
            <CalendarDays size={13} className="text-sky-500" />
            Con Kalender
          </p>
          <CalendarGrid events={calendarEvents ?? []} />
        </motion.div>
      )}

      {/* Archive */}
      {(calendarEvents ?? []).length > 0 && (
        <motion.div variants={item}>
          <CalendarArchive events={calendarEvents ?? []} />
        </motion.div>
      )}

      {/* Crew members — collapsible */}
      <motion.div variants={item}>
        <button
          onClick={() => setCrewExpanded((e) => !e)}
          className="flex w-full items-center justify-between mb-3 group"
        >
          <p className="section-label">Crew members ({allUsers.length})</p>
          <motion.div
            animate={{ rotate: crewExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400 group-hover:text-slate-600 transition-colors"
          >
            <ChevronDown size={16} />
          </motion.div>
        </button>

        {/* Avatar strip (always visible) */}
        {!crewExpanded && allUsers.length > 0 && (
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCrewExpanded(true)}
          >
            <div className="flex -space-x-2">
              {allUsers.slice(0, 8).map((u) => (
                <div
                  key={u.name}
                  title={u.name}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-xs font-black text-white ${avatarColor(u.name)}`}
                >
                  {u.name[0]}
                </div>
              ))}
              {allUsers.length > 8 && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-black text-slate-600">
                  +{allUsers.length - 8}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Tik om te bekijken
            </span>
          </div>
        )}

        <AnimatePresence>
          {crewExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      className="input-field py-2 pl-8 text-sm"
                      placeholder="Wie zoek je?"
                      value={crewQuery}
                      onChange={(e) => setCrewQuery(e.target.value)}
                    />
                  </div>

                  <div className="card-surface rounded-2xl divide-y divide-slate-50">
                    {filteredUsers.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">
                        Geen resultaten voor &ldquo;{crewQuery}&rdquo;
                      </p>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u.name}
                          className="flex items-center gap-3 px-4 py-3.5"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${avatarColor(u.name)}`}
                          >
                            {u.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm">
                              {u.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                              {u.hotel_room && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <BedDouble size={11} />
                                  Kamer {u.hotel_room}
                                </span>
                              )}
                              {u.phone_number && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <Phone size={11} />
                                  {u.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                          {u.live_location_ping && (
                            <LocationPingDisplay raw={u.live_location_ping} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* App info */}
      <motion.div variants={item}>
        <div className="rounded-2xl border border-slate-100 bg-white/60 px-5 py-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-sky-100 shadow-sm overflow-hidden">
            <img
              src="/assets/images/ankerd-logo.png"
              alt="Ankerd"
              className="h-8 w-8 object-contain"
            />
          </div>
          <p className="font-black text-slate-800 text-sm">Ankerd Con</p>
          <p className="text-xs text-slate-400 mt-0.5">Event portal · v1.0</p>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div variants={item}>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 py-3.5 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
        >
          <LogOut size={16} />
          Uitloggen
        </button>
      </motion.div>

      {/* Ping modal */}
      <Modal
        open={pingOpen}
        onClose={() => setPingOpen(false)}
        title="Locatie pingen"
        description="Stuur een snelle update naar de groep"
      >
        <form onSubmit={handleSubmit(onPing)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            {allUsers.length > 0 ? (
              <select className="input-field" {...register("user_name")}>
                <option value="">Selecteer naam…</option>
                {allUsers.map((u) => (
                  <option key={u.name} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input-field"
                placeholder="Naam"
                {...register("user_name")}
              />
            )}
            {errors.user_name && (
              <p className="mt-1.5 text-xs text-rose-500">
                {errors.user_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Zone
            </label>
            <select className="input-field" {...register("zone")}>
              <option value="">Selecteer zone…</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            {errors.zone && (
              <p className="mt-1.5 text-xs text-rose-500">
                {errors.zone.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Details
            </label>
            <input
              className="input-field"
              placeholder="Bijv. Hal B, ingang links"
              {...register("text")}
            />
            {errors.text && (
              <p className="mt-1.5 text-xs text-rose-500">
                {errors.text.message}
              </p>
            )}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            <MapPin size={16} />
            Pingen
          </Button>
        </form>
      </Modal>
    </motion.div>
  );
}
