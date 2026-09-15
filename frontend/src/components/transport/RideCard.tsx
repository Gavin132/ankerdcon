import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Link2,
  UserMinus,
  Users,
} from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { SeatDots } from "./SeatDots";
import { useClaimSeat, useLeaveSeat } from "../../hooks/useRides";
import { useUsers } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { formatDate, formatTime } from "../../utils/format";
import { getRideStatus, formatCountdown, rideLocationLabel } from "../../utils/rides";
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
  const navigate = useNavigate();
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

  const fromLabel = rideLocationLabel(ride.start_location, linkedEvent, "Onbekende locatie");
  const toLabel   = rideLocationLabel(ride.end_location, linkedEvent, isInbound ? "Con locatie" : "Bestemming");
  const toIsPlaceholder = !ride.end_location;

  const resolvedPassengers = new Set(
    ride.passengers.map((p) => {
      const u = users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
      return u?.name ?? p;
    }),
  );
  const availableToJoin = userNames.filter((n) => !resolvedPassengers.has(n));

  const TransportIcon = isPT ? Train : isTimo ? Truck : Car;

  // Status pill: rose when leaving very soon, amber when soon, neutral once gone.
  const statusBadge = status === "urgent" || status === "soon" || status === "recent";
  const statusBadgeClass = status === "urgent"
    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
    : status === "soon"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      : "bg-sunken text-ink-2";

  const showSeats = !isPT && ride.total_seats < 99;
  const takenSeats = ride.total_seats - ride.seats_left;

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
      <motion.div
        variants={listItem}
        className={isRecent || isPast ? "opacity-70" : ""}
      >
        <div
          onClick={() => navigate(routes.ride.view(ride.id))}
          className="card-surface-hover flex cursor-pointer flex-col gap-2.5 p-3.5"
        >
          {/* ── Top: driver + time ── */}
          <div className="flex items-center gap-2.5">
            {isPT ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <TransportIcon size={15} />
              </span>
            ) : (
              <UserAvatar name={ride.driver} className="h-8 w-8 text-[11px]" />
            )}
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[14px] font-semibold text-ink">{resolveName(ride.driver)}</span>
              <span className="flex items-center gap-1 text-[11.5px] text-ink-3">
                <TransportIcon size={12} className="shrink-0" />
                <span className="truncate">
                  {ride.direction === "Inbound" ? "Heen" : ride.direction === "Outbound" ? "Terug" : "Restaurant"}
                  {" · "}
                  {isPT ? "Vervoerder" : "Chauffeur"}
                </span>
              </span>
            </div>
            <div className="ml-auto shrink-0 text-right leading-tight">
              <p className="font-mono text-[15px] font-semibold tabular-nums text-ink">{formatTime(ride.departure_time)}</p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-3">{formatDate(ride.departure_time)}</p>
            </div>
          </div>

          {/* ── Status / action required ── */}
          {(statusBadge || (ride.action_required && !isPast)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {statusBadge && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${statusBadgeClass}`}>
                  <Timer size={11} />
                  {status === "urgent" && `Over ${formatCountdown(minutesUntil)}`}
                  {status === "soon"   && `Over ${formatCountdown(minutesUntil)}`}
                  {status === "recent" && "Vertrokken"}
                </span>
              )}
              {ride.action_required && !isPast && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  <AlertCircle size={11} className="shrink-0" />
                  Actie vereist — reageer hieronder
                </span>
              )}
            </div>
          )}

          {/* ── Route: stop, leg, stop ── */}
          <div className="grid grid-cols-[10px_minmax(0,1fr)] gap-x-2.5 text-[12.5px]">
            <i aria-hidden className="mt-[4px] block h-[9px] w-[9px] rounded-full border-2 border-ink" />
            <p className="truncate font-medium text-ink">
              <span className="sr-only">Van </span>
              {fromLabel}
            </p>
            <i aria-hidden className="ml-[3.5px] block h-2.5 w-0.5 bg-line" />
            <span aria-hidden />
            <i aria-hidden className="mt-[4px] block h-[9px] w-[9px] rounded-full border-2 border-ink bg-ink" />
            <p className={`truncate ${toIsPlaceholder ? "italic text-ink-3" : "font-medium text-ink"}`}>
              <span className="sr-only">Naar </span>
              {toLabel}
            </p>
          </div>

          {linkedEvent && (
            <Link
              to={routes.event.view(linkedEvent.id)}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-full items-center gap-1 self-start rounded-md border border-line px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
            >
              <Link2 size={10} className="shrink-0" />
              <span className="truncate">{linkedEvent.event_name}</span>
            </Link>
          )}

          {/* ── Footer: seats, passengers, actions ── */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-dashed border-line pt-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-2">
              {showSeats && (
                <span
                  className="flex items-center gap-1.5"
                  title={`${takenSeats}/${ride.total_seats} plekken bezet`}
                >
                  <SeatDots total={ride.total_seats} left={ride.seats_left} />
                  <span className="sr-only">{takenSeats}/{ride.total_seats} plekken bezet</span>
                  {canAct && (
                    <span className={ride.is_full ? "font-semibold text-rose-700 dark:text-rose-300" : ""}>
                      {ride.is_full ? "Vol" : `${ride.seats_left} vrij`}
                    </span>
                  )}
                </span>
              )}
              {!showSeats && !isPT && canAct && (
                <span className={ride.is_full ? "font-semibold text-rose-700 dark:text-rose-300" : ""}>
                  {ride.is_full ? "Vol" : `${ride.seats_left} vrij`}
                </span>
              )}

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (ride.passengers.length > 0) setPassengersOpen((v) => !v); }}
                className={`flex min-w-0 items-center gap-1 ${ride.passengers.length > 0 ? "hover:text-ink" : "cursor-default"}`}
                aria-expanded={ride.passengers.length > 0 ? passengersOpen : undefined}
              >
                {ride.passengers.length > 0 ? (
                  <>
                    <Users size={12} className="shrink-0 text-ink-3" />
                    <span>
                      <span className="font-mono font-semibold tabular-nums text-ink">{ride.passengers.length}</span> meerijder{ride.passengers.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronDown size={12} className={`shrink-0 text-ink-3 transition-transform ${passengersOpen ? "rotate-180" : ""}`} />
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-ink-3">
                    <Users size={12} />
                    Geen meerijders
                  </span>
                )}
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); exportRideToIcs(ride); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                title="Exporteer naar kalender"
              >
                <CalendarPlus size={14} />
              </button>

              {canAct && ride.passengers.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLeaveNames([]); setLeaveOpen(true); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                  title="Uitstappen"
                >
                  <UserMinus size={14} />
                </button>
              )}

              {canAct && !ride.is_full && (
                <Button size="sm" variant="primary" className="ml-1 !min-h-[36px] !py-1.5" onClick={(e) => { e.stopPropagation(); setClaimNames([]); setClaimOpen(true); }}>
                  <Plus size={13} />
                  Stap in
                </Button>
              )}
            </div>
          </div>

          {/* Expanded passengers */}
          <AnimatePresence>
            {passengersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="-mt-1 overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ride.passengers.map((p) => (
                    <div
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-line px-2 py-1 text-[12px] font-medium text-ink-2"
                    >
                      <UserAvatar name={p} className="h-4 w-4 text-[8px] !border-0" />
                      {resolveName(p)}
                    </div>
                  ))}
                  {ride.parking_info && (
                    <div className="mt-1 flex w-full items-start gap-2 rounded-lg bg-sunken px-3 py-2.5">
                      <ParkingCircle size={13} className="mt-0.5 shrink-0 text-ink-3" />
                      <div className="min-w-0">
                        <p className="section-label mb-0.5">Parkeerinfo</p>
                        <p className="text-xs leading-relaxed text-ink-2">{ride.parking_info}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
