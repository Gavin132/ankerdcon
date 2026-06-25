import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Bus,
  UtensilsCrossed,
  Wallet,
  BedDouble,
  MapPin,
  Hotel,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "../config/routes";
import { HubSkeleton } from "../components/common/Skeleton";
import { DailyActionCheck } from "../components/hub/DailyActionCheck";
import { CrewSection } from "../components/hub/CrewSection";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useMeals } from "../hooks/useMeals";
import { usePayments } from "../hooks/usePayments";
import { useUsers } from "../hooks/useUsers";
import { useAuthStore } from "../store/auth.store";
import { formatDate } from "../utils/format";
import { UserAvatar } from "../components/common/UserAvatar";
import { listItem, listContainer } from "../utils/motion";
import { parseEventDate, toDateKey, todayKey } from "../utils/date";
import { getRideStatus } from "../utils/rides";
import { computeRestaurantGaps } from "../components/hub/ComputeRestaurantGap";
import { computeActionAlerts } from "../components/hub/ComputeActionAlert";
import type { User } from "../types";

const DAYS_NL = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
const MONTHS_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

export function HubPage() {
  const navigate = useNavigate();
  const { currentUser: currentUserId } = useAuthStore();
  const [participantsExpanded, setParticipantsExpanded] = useState(false);

  const { data: events, isLoading: evLoading } = useCalendar();
  const { data: rides } = useRides();
  const { data: meals } = useMeals();
  const { data: payments } = usePayments();
  const { data: users } = useUsers();

  if (evLoading) return <HubSkeleton />;

  // ── Derived data ────────────────────────────────────────────────────────────
  const me = (users ?? []).find((u) => u.id === currentUserId);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const todayFormatted = `${DAYS_NL[now.getDay()]} ${now.getDate()} ${MONTHS_NL[now.getMonth()]}`;

  const totalSpend = (payments ?? []).reduce((s, p) => s + p.amount, 0);

  const todayStr = todayKey();
  const event =
    (events ?? [])
      .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
      .filter(({ date }) => date !== null && toDateKey(date) >= todayStr)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())[0]?.ev ?? null;

  const eventDate = event ? parseEventDate(event.date) : null;
  const msUntil = eventDate ? eventDate.getTime() - Date.now() : null;
  const daysUntil = msUntil !== null ? Math.max(0, Math.ceil(msUntil / 86_400_000)) : null;

  const futureRidesCount = (rides ?? []).filter(
    (r) => getRideStatus(r.departure_time).status !== "past",
  ).length;
  const futureMealsCount = (meals ?? []).filter((m) => {
    const d = new Date(m.time.replace(" ", "T"));
    return !isNaN(d.getTime()) && d > now;
  }).length;

  const actionAlerts = computeActionAlerts(events ?? [], rides ?? [], meals ?? []);
  const restaurantGaps = computeRestaurantGaps(rides ?? []);

  const hotelRooms: [string, User[]][] = event?.is_hotel
    ? Object.entries(
        (users ?? [])
          .filter((u) => u.hotel_room)
          .reduce<Record<string, User[]>>((acc, u) => {
            (acc[u.hotel_room] = acc[u.hotel_room] || []).push(u);
            return acc;
          }, {}),
      ).sort(([a], [b]) => a.localeCompare(b))
    : [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-5"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <motion.div variants={listItem} className="flex items-center justify-between pt-1">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {greeting}
          </p>
          <h1 className="mt-0.5 text-[22px] font-black leading-tight tracking-tight text-slate-900 dark:text-white truncate">
            {me?.name ?? "…"}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 font-medium">{todayFormatted}</p>
        </div>
        {me && (
          <UserAvatar name={me.name} className="h-12 w-12 text-base shrink-0 ml-4" />
        )}
      </motion.div>

      {/* ── Next event card ───────────────────────────────────────────────── */}
      {event && (
        <motion.div variants={listItem}>
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{ background: "linear-gradient(145deg, #0c1628 0%, #0f1e38 60%, #0e172e 100%)" }}
          >
            {/* Atmospheric glows */}
            <div className="pointer-events-none absolute -top-16 -right-8 h-56 w-56 rounded-full bg-sky-500/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 left-4 h-40 w-72 bg-indigo-600/10 blur-3xl" />
            {/* Subtle grid pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            {/* Top edge highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />

            <div className="relative p-5">
              {/* Header row: badge + countdown */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/20 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-[0.12em]">
                    Aankomend
                  </span>
                </div>
                {daysUntil !== null && (
                  <div className="shrink-0 rounded-xl bg-white/10 border border-white/8 px-3 py-2 text-center min-w-[52px]">
                    <p className="text-[22px] font-black text-white leading-none tabular-nums">
                      {daysUntil === 0 ? "!" : daysUntil}
                    </p>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                      {daysUntil === 0 ? "vandaag" : daysUntil === 1 ? "dag" : "dagen"}
                    </p>
                  </div>
                )}
              </div>

              {/* Event name */}
              <h2 className="text-[21px] font-black text-white leading-tight tracking-tight">
                {event.event_name}
              </h2>

              {/* Meta */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="flex items-center gap-1.5 text-sm text-sky-300/60">
                  <CalendarDays size={12} className="text-sky-400/60" />
                  {formatDate(event.date)}
                </span>
                {event.is_hotel && (
                  <span className="flex items-center gap-1.5 text-sm text-sky-300/60">
                    <BedDouble size={12} className="text-sky-400/60" />
                    Hotel inbegrepen
                  </span>
                )}
              </div>

              {/* Attendance */}
              {(users ?? []).length > 0 && event.participants.length > 0 && (
                <div className="mt-4 space-y-3">
                  {/* Progress bar + fraction */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-400 transition-all duration-700"
                        style={{
                          width: `${Math.round((event.participants.length / (users ?? []).length) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-white/40 tabular-nums">
                      {event.participants.length}/{(users ?? []).length}
                    </span>
                  </div>

                  {/* Avatar stack + toggle */}
                  <button
                    onClick={() => setParticipantsExpanded((v) => !v)}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <div className="flex -space-x-2">
                      {event.participants.slice(0, 7).map((p) => (
                        <UserAvatar
                          key={p}
                          name={p}
                          className="h-6 w-6 text-[9px] !border-[#0f1e38]"
                        />
                      ))}
                      {event.participants.length > 7 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0f1e38] bg-white/15 text-[9px] font-black text-white">
                          +{event.participants.length - 7}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-sky-400/60 hover:text-sky-400 transition-colors">
                      {participantsExpanded
                        ? "Verbergen"
                        : `${event.participants.length} aangemeld`}
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
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {event.participants.map((p) => {
                            const resolved = users?.find((u) => u.name === p || u.discord_username === p);
                            const displayName = resolved?.name ?? p;
                            return (
                              <span
                                key={p}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/10 px-2 py-1 text-[11px] font-semibold text-sky-200"
                              >
                                <UserAvatar name={p} className="h-3.5 w-3.5 text-[7px] !border-0" />
                                {displayName}
                              </span>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Daily action alerts ───────────────────────────────────────────── */}
      <DailyActionCheck alerts={actionAlerts} restaurantGaps={restaurantGaps} />

      {/* ── Quick nav grid ────────────────────────────────────────────────── */}
      <motion.div variants={listItem}>
        <p className="section-label mb-3">Snelle navigatie</p>
        <div className="grid grid-cols-2 gap-3">

          {/* Ritten */}
          <motion.button
            onClick={() => navigate(routes.transport)}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-4 text-left shadow-stat"
            whileHover={{ y: -2, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <Bus size={15} className="text-white" />
                </div>
                <span className="rounded-full bg-white/20 border border-white/15 px-2 py-0.5 text-[11px] font-black text-white tabular-nums">
                  {futureRidesCount}
                </span>
              </div>
              <p className="text-[15px] font-black text-white leading-tight">Ritten</p>
              <p className="mt-0.5 text-[10px] font-bold text-white/55 uppercase tracking-wider">Transport</p>
            </div>
          </motion.button>

          {/* Maaltijden */}
          <motion.button
            onClick={() => navigate(routes.food)}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 p-4 text-left shadow-stat"
            whileHover={{ y: -2, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <UtensilsCrossed size={15} className="text-white" />
                </div>
                <span className="rounded-full bg-white/20 border border-white/15 px-2 py-0.5 text-[11px] font-black text-white tabular-nums">
                  {futureMealsCount}
                </span>
              </div>
              <p className="text-[15px] font-black text-white leading-tight">Maaltijden</p>
              <p className="mt-0.5 text-[10px] font-bold text-white/55 uppercase tracking-wider">Eten</p>
            </div>
          </motion.button>

          {/* Financiën */}
          <motion.button
            onClick={() => navigate(routes.finance)}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-4 text-left shadow-stat"
            whileHover={{ y: -2, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <div className="mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <Wallet size={15} className="text-white" />
                </div>
              </div>
              <p className="text-[15px] font-black text-white leading-none">€{totalSpend.toFixed(0)}</p>
              <p className="mt-0.5 text-[10px] font-bold text-white/55 uppercase tracking-wider">Uitgaven</p>
            </div>
          </motion.button>

          {/* Locatie pingen */}
          <motion.button
            onClick={() => navigate(routes.more)}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-4 text-left shadow-stat"
            whileHover={{ y: -2, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <div className="mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <MapPin size={15} className="text-white" />
                </div>
              </div>
              <p className="text-[15px] font-black text-white leading-none">Locatie</p>
              <p className="mt-0.5 text-[10px] font-bold text-white/55 uppercase tracking-wider">Pingen</p>
            </div>
          </motion.button>

        </div>
      </motion.div>

      {/* ── Hotel rooms ───────────────────────────────────────────────────── */}
      {hotelRooms.length > 0 && (
        <motion.div variants={listItem}>
          <p className="section-label mb-3 flex items-center gap-2">
            <Hotel size={12} className="text-sky-500" />
            Hotelkamers
          </p>
          <div className="space-y-2.5">
            {hotelRooms.map(([room, roomUsers]) => (
              <div
                key={room}
                className="card-surface flex items-center gap-4 rounded-2xl px-4 py-3.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600">
                  <BedDouble size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Kamer {room}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {roomUsers.map((u) => (
                        <UserAvatar key={u.name} name={u.name} className="h-6 w-6 text-[9px]" />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                      {roomUsers.map((u) => u.name).join(", ")}
                    </span>
                  </div>
                </div>
                <ArrowRight size={14} className="shrink-0 text-slate-300 dark:text-slate-600" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Crew roster ───────────────────────────────────────────────────── */}
      {(users ?? []).length > 0 && <CrewSection users={users ?? []} />}

    </motion.div>
  );
}
