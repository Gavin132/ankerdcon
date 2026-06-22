import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Bus,
  UtensilsCrossed,
  Wallet,
  BedDouble,
  Users,
  UserCheck,
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
import { useUsers } from "../hooks/useUsers";
import { formatDate } from "../utils/format";
import { avatarColor } from "../utils/avatar";
import { listItem, listContainer } from "../utils/motion";
import { computeRestaurantGaps } from "../components/hub/ComputeRestaurantGap";
import { computeActionAlerts } from "../components/hub/ComputeActionAlert";

export function HubPage() {
  const navigate = useNavigate();
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const { data: events, isLoading: evLoading } = useCalendar();
  const { data: rides } = useRides();
  const { data: meals } = useMeals();
  const { data: payments } = usePayments();
  const { data: users } = useUsers();

  if (evLoading) {
    return <HubSkeleton />;
  }

  const totalSpend = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const event = events?.[0];
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
