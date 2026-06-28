import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Truck,
  Train,
  ParkingCircle,
  Plus,
  ChevronDown,
  Timer,
  AlertCircle,
  CalendarPlus,
  ArrowRight,
  Link2,
  UserMinus,
  Users,
} from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { useClaimSeat, useLeaveSeat } from "../../hooks/useRides";
import { useUsers } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { formatDate, formatTime } from "../../utils/format";
import { getRideStatus, formatCountdown } from "../../utils/rides";
import { exportRideToIcs } from "../../utils/ics";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import type { Ride } from "../../types";

interface RideCardProps {
  ride: Ride;
  userNames: string[];
}

export function RideCard({ ride, userNames }: RideCardProps) {
  const [passengersOpen, setPassengersOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [claimNames, setClaimNames] = useState<string[]>([]);
  const [leaveNames, setLeaveNames] = useState<string[]>([]);
  const [, tick] = useState(0);

  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();
  const { data: users = [] } = useUsers();
  const { data: events = [] } = useCalendar();

  const linkedEvent = ride.linked_event_id
    ? events.find((e) => e.id === ride.linked_event_id)
    : undefined;

  function resolveName(stored: string) {
    return (
      users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored))?.name ?? stored
    );
  }

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { status, minutesUntil } = getRideStatus(ride.departure_time);

  const isPT      = ride.is_public_transport;
  const isInbound = ride.direction === "Inbound";
  const isTimo    = ride.driver.trim().toLowerCase().startsWith("timo");
  const isRecent  = status === "recent";
  const isPast    = status === "past";
  const canAct    = !isRecent && !isPast;

  const fromLabel = ride.start_location;
  const toLabel   = ride.end_location || (isInbound ? "Con locatie" : "Bestemming");

  const resolvedPassengers = new Set(
    ride.passengers.map((p) => {
      const u = users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
      return u?.name ?? p;
    }),
  );
  const availableToJoin = userNames.filter((n) => !resolvedPassengers.has(n));

  const TransportIcon = isPT ? Train : isTimo ? Truck : Car;

  // Accent gradient per status/type
  const accentGradient = isPT
    ? "from-violet-500 to-purple-500"
    : status === "urgent"
      ? "from-rose-500 to-rose-400"
      : status === "soon"
        ? "from-amber-400 to-orange-400"
        : "from-sky-500 to-blue-500";

  // Status badge styling
  const statusBadge = status === "urgent" || status === "soon" || status === "recent";
  const statusBadgeClass = status === "urgent"
    ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
    : status === "soon"
      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";

  async function handleClaim() {
    if (claimNames.length === 0) return;
    try {
      for (const name of claimNames) {
        await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
      }
      setClaimNames([]);
      setClaimOpen(false);
      toast("success", claimNames.length === 1 ? `${claimNames[0]} staat in de rit!` : `${claimNames.length} personen staan in de rit!`);
    } catch {
      toast("error", "Kon plek niet claimen. Probeer opnieuw.");
    }
  }

  async function handleLeave() {
    if (leaveNames.length === 0) return;
    try {
      for (const name of leaveNames) {
        await leaveMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
      }
      setLeaveNames([]);
      setLeaveOpen(false);
      toast("success", leaveNames.length === 1 ? `${leaveNames[0]} is uitgestapt.` : `${leaveNames.length} personen uitgestapt.`);
    } catch {
      toast("error", "Kon je niet uitschrijven.");
    }
  }

  return (
    <>
      <motion.div variants={listItem} className={isRecent || isPast ? "opacity-60" : ""}>
        <div className="card-surface rounded-2xl overflow-hidden">

          {/* Status-colored accent line */}
          <div className={`h-[3px] bg-gradient-to-r ${accentGradient}`} />

          {/* Action required banner */}
          {ride.action_required && !isPast && (
            <div className="flex items-center gap-2 border-b border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/25 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
              <AlertCircle size={12} className="shrink-0" />
              Actie vereist — reageer hieronder
            </div>
          )}

          {/* ── Top row: icon + direction + status + date/time ── */}
          <div className="px-4 pt-3.5 pb-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${accentGradient}`}>
                  <TransportIcon size={13} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {ride.direction === "Inbound" ? "Heen" : ride.direction === "Outbound" ? "Terug" : "Restaurant"}
                </span>
                {statusBadge && (
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass} ${status === "urgent" ? "animate-pulse" : ""}`}>
                    <Timer size={9} />
                    {status === "urgent" && `Over ${formatCountdown(minutesUntil)}`}
                    {status === "soon"   && `Over ${formatCountdown(minutesUntil)}`}
                    {status === "recent" && "Vertrokken"}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(ride.departure_time)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatTime(ride.departure_time)}</p>
              </div>
            </div>
          </div>

          {/* ── Route section ─────────────────────────────────── */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-stretch gap-4">

              {/* Dot → line → dot track */}
              <div className="flex flex-col items-center pt-1 pb-1">
                <div className="h-2.5 w-2.5 rounded-full border-2 border-slate-300 dark:border-slate-500 bg-white dark:bg-[#1e293b] shrink-0" />
                <div className={`w-0.5 flex-1 my-1.5 rounded-full bg-gradient-to-b ${accentGradient}`} style={{ minHeight: "1.5rem" }} />
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 bg-gradient-to-br ${accentGradient}`} />
              </div>

              {/* From / To */}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Van</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{fromLabel}</p>
                </div>
                <div className="mt-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Naar</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{toLabel}</p>
                </div>
              </div>

              {/* Driver + availability (right column) */}
              <div className="shrink-0 flex flex-col items-end justify-between">
                <div className="flex items-center gap-2">
                  {!isPT && <UserAvatar name={ride.driver} className="h-7 w-7 text-[11px]" />}
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                      {isPT ? "Vervoerder" : "Chauffeur"}
                    </p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[90px]">
                      {resolveName(ride.driver)}
                    </p>
                  </div>
                </div>
                {!isPT && !isRecent && !isPast && (
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    ride.is_full
                      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                      : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  }`}>
                    <Users size={10} />
                    {ride.is_full ? "Vol" : `${ride.seats_left} vrij`}
                  </span>
                )}
              </div>
            </div>

            {/* Capacity bar */}
            {!isPT && ride.total_seats < 99 && (
              <div className="mt-3.5 space-y-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${ride.is_full ? "from-rose-400 to-rose-500" : accentGradient}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: (ride.total_seats - ride.seats_left) / ride.total_seats }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  <span className="font-bold text-slate-600 dark:text-slate-300">{ride.total_seats - ride.seats_left}</span>/{ride.total_seats} plekken bezet
                </p>
              </div>
            )}
          </div>

          {/* ── Passengers toggle row ────────────────────────── */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => ride.passengers.length > 0 && setPassengersOpen((v) => !v)}
              className={`flex items-center gap-2 min-w-0 ${ride.passengers.length > 0 ? "hover:opacity-75 transition-opacity" : "cursor-default"}`}
            >
              {ride.passengers.length > 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {ride.passengers.slice(0, 4).map((p) => (
                      <UserAvatar key={p} name={p} className="h-6 w-6 text-[9px] ring-2 ring-white dark:ring-[#1e293b]" />
                    ))}
                    {ride.passengers.length > 4 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#1e293b] bg-slate-200 dark:bg-slate-600 text-[9px] font-bold text-slate-600 dark:text-slate-200">
                        +{ride.passengers.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{ride.passengers.length}</span> meerijder{ride.passengers.length !== 1 ? "s" : ""}
                  </span>
                  <motion.div animate={{ rotate: passengersOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                    <ChevronDown size={11} className="text-slate-400" />
                  </motion.div>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
                  <Users size={11} />
                  Geen meerijders
                </span>
              )}
            </button>

            {linkedEvent && (
              <Link
                to={routes.event.view(linkedEvent.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-700/60 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors max-w-[140px]"
              >
                <Link2 size={10} className="shrink-0" />
                <span className="truncate">{linkedEvent.event_name}</span>
              </Link>
            )}
          </div>

          {/* Expanded passengers */}
          <AnimatePresence>
            {passengersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {ride.passengers.map((p) => (
                    <div
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <UserAvatar name={p} className="h-4 w-4 text-[8px] !border-0" />
                      {resolveName(p)}
                    </div>
                  ))}
                  {ride.parking_info && (
                    <div className="w-full mt-1.5 flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-3 py-2.5">
                      <ParkingCircle size={13} className="shrink-0 text-sky-500 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Parkeerinfo</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{ride.parking_info}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Action bar ──────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-3 py-2">
            <Link
              to={routes.ride.view(ride.id)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Details
              <ArrowRight size={11} />
            </Link>

            <div className="flex-1" />

            <button
              onClick={() => exportRideToIcs(ride)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-500 transition-colors"
              title="Exporteer naar kalender"
            >
              <CalendarPlus size={14} />
            </button>

            {canAct && ride.passengers.length > 0 && (
              <button
                onClick={() => { setLeaveNames([]); setLeaveOpen(true); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-rose-500 transition-colors"
                title="Uitstappen"
              >
                <UserMinus size={14} />
              </button>
            )}

            {canAct && !ride.is_full && (
              <Button size="sm" variant="primary" onClick={() => { setClaimNames([]); setClaimOpen(true); }}>
                <Plus size={13} />
                Stap in
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stap in modal */}
      <Modal
        open={claimOpen}
        onClose={() => { setClaimOpen(false); setClaimNames([]); }}
        title="Stap in"
        description={`${fromLabel} → ${toLabel}${isPT ? "" : ` · ${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}`}
      >
        <div className="space-y-3">
          <NamePicker multiple options={availableToJoin} value={claimNames} onChange={setClaimNames} maxSelect={isPT ? undefined : ride.seats_left} color="sky" />
          <Button onClick={handleClaim} loading={claimMutation.isPending} className="w-full" disabled={claimNames.length === 0}>
            <Plus size={15} />
            {claimNames.length === 0 ? "Selecteer een naam" : claimNames.length === 1 ? `${claimNames[0]} stapt in` : `${claimNames.length} personen stappen in`}
          </Button>
        </div>
      </Modal>

      {/* Uitstappen modal */}
      <Modal
        open={leaveOpen}
        onClose={() => { setLeaveOpen(false); setLeaveNames([]); }}
        title="Uitstappen"
        description="Wie stappen er uit?"
      >
        <div className="space-y-3">
          <NamePicker multiple options={ride.passengers} value={leaveNames} onChange={setLeaveNames} color="rose" />
          <Button variant="danger" onClick={handleLeave} loading={leaveMutation.isPending} className="w-full" disabled={leaveNames.length === 0}>
            {leaveNames.length === 0 ? "Selecteer een naam" : leaveNames.length === 1 ? `${leaveNames[0]} uitstappen` : `${leaveNames.length} personen uitstappen`}
          </Button>
        </div>
      </Modal>
    </>
  );
}
