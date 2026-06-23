import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Bus,
  UtensilsCrossed,
  Wallet,
  BedDouble,
  UserCheck,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HubSkeleton } from "../components/common/Skeleton";
import { DailyActionCheck } from "../components/hub/DailyActionCheck";
import { StatCard } from "../components/hub/StatCard";
import { CrewSection } from "../components/hub/CrewSection";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useMeals } from "../hooks/useMeals";
import { usePayments } from "../hooks/usePayments";
import { useUser } from "../hooks/useUsers";
import { formatDate } from "../utils/format";
import { avatarColor } from "../utils/avatar";
import { listItem, listContainer } from "../utils/motion";
import { parseEventDate, toDateKey, todayKey } from "../utils/date";
import { getRideStatus } from "../utils/rides";
import { computeRestaurantGaps } from "../components/hub/ComputeRestaurantGap";
import { computeActionAlerts } from "../components/hub/ComputeActionAlert";

export function HubPage() {
  const navigate = useNavigate();
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const { data: events, isLoading: evLoading } = useCalendar();
  const { data: rides } = useRides();
  const { data: meals } = useMeals();
  const { data: payments } = usePayments();
  const { data: users } = useUser();

  if (evLoading) {
    return <HubSkeleton />;
  }

  const totalSpend = (payments ?? []).reduce((s, p) => s + p.amount, 0);

  const todayStr = todayKey();
  const event =
    (events ?? [])
      .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
      .filter(({ date }) => date !== null && toDateKey(date) >= todayStr)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())[0]?.ev ?? null;

  const futureRidesCount = (rides ?? []).filter(
    (r) => getRideStatus(r.departure_time).status !== "past",
  ).length;
  const futureMealsCount = (meals ?? []).filter((m) => {
    const d = new Date(m.time.replace(" ", "T"));
    return !isNaN(d.getTime()) && d > new Date();
  }).length;

  const actionAlerts = computeActionAlerts(
    events ?? [],
    rides ?? [],
    meals ?? [],
  );
  const restaurantGaps = computeRestaurantGaps(rides ?? []);

  return (
    <motion.div
      className="space-y-6"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {/* Hero event card */}
      <motion.div variants={listItem}>
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

              {/* Attendance summary */}
              {(users ?? []).length > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-300 transition-all duration-700"
                      style={{ width: `${Math.round((event.participants.length / (users ?? []).length) * 100)}%` }}
                    />
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-2.5 py-1">
                    <UserCheck size={11} className="text-sky-300" />
                    <span className="text-xs font-bold text-white">
                      {event.participants.length} <span className="font-normal text-sky-300/80">van</span> {(users ?? []).length}
                    </span>
                  </div>
                </div>
              )}

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
                      {participantsExpanded
                        ? "Verbergen"
                        : `${event.participants.length} deelnemers`}
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
      <DailyActionCheck alerts={actionAlerts} restaurantGaps={restaurantGaps} />

      {/* Stats grid */}
      <motion.div variants={listItem}>
        <p className="section-label mb-3">Overzicht</p>

        {/* Location ping — full width, above the stat cards */}
        <motion.button
          onClick={() => navigate("/more")}
          className="mb-3 w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-left shadow-stat cursor-pointer"
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Navigation size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-base font-black text-white leading-none">Locatie pingen</div>
              <div className="mt-1 text-xs font-semibold text-white/70 uppercase tracking-widest">
                Stuur je locatie naar de groep
              </div>
            </div>
            <ChevronRight size={16} className="text-white/50 group-hover:text-white/80 transition-colors" />
          </div>
        </motion.button>

        {/* 3 stat cards in a single row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            compact
            gradient="bg-gradient-to-br from-sky-500 to-blue-600"
            icon={<Bus size={15} className="text-white" />}
            value={futureRidesCount}
            label="Ritten"
            onClick={() => navigate("/transport")}
          />
          <StatCard
            compact
            gradient="bg-gradient-to-br from-cyan-400 to-sky-500"
            icon={<UtensilsCrossed size={15} className="text-white" />}
            value={futureMealsCount}
            label="Maaltijden"
            onClick={() => navigate("/food")}
          />
          <StatCard
            compact
            gradient="bg-gradient-to-br from-blue-600 to-blue-800"
            icon={<Wallet size={15} className="text-white" />}
            value={`€${totalSpend.toFixed(0)}`}
            label="Uitgaven"
            onClick={() => navigate("/finance")}
          />
        </div>
      </motion.div>

      {/* Crew roster */}
      {(users ?? []).length > 0 && <CrewSection users={users ?? []} />}
    </motion.div>
  );
}
