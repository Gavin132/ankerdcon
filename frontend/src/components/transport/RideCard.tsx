import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Truck,
  Train,
  ParkingCircle,
  Plus,
  Timer,
  AlertCircle,
  UserMinus,
} from "lucide-react";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { useClaimSeat, useLeaveSeat } from "../../hooks/useRides";
import { useUsers } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { formatTime } from "../../utils/format";
import { getRideStatus, formatCountdown, rideLocationLabel } from "../../utils/rides";
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
  const [expandedAction, setExpandedAction] = useState<"claim" | "leave" | null>(null);
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

  async function handleClaim() {
    if (claimNames.length === 0) return;
    try {
      for (const name of claimNames) {
        await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
      }
      setClaimNames([]);
      setExpandedAction(null);
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
      setExpandedAction(null);
      toast("success", leaveNames.length === 1 ? `${leaveNames[0]} is uitgestapt.` : `${leaveNames.length} personen uitgestapt.`);
    } catch {
      toast("error", "Kon je niet uitschrijven.");
    }
  }

  function toggleAction(action: "claim" | "leave") {
    setExpandedAction((prev) => (prev === action ? null : action));
    setClaimNames([]);
    setLeaveNames([]);
  }

  return (
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

          {/* ── Footer: riders, actions ── */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-dashed border-line pt-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-2">
              {ride.passengers.length > 0 ? (
                <span className="flex -space-x-1.5">
                  {ride.passengers.slice(0, 6).map((p) => (
                    <UserAvatar key={p} name={resolveName(p)} className="h-6 w-6 text-[9px] !border-surface" />
                  ))}
                  {ride.passengers.length > 6 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-sunken font-mono text-[9px] font-semibold text-ink-2">
                      +{ride.passengers.length - 6}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-ink-3">Nog geen meerijders</span>
              )}
              {!isPT && canAct && (
                <span className={ride.is_full ? "font-semibold text-rose-700 dark:text-rose-300" : ""}>
                  {ride.is_full ? "Vol" : `${ride.seats_left} vrij`}
                </span>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1">
              {canAct && ride.passengers.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleAction("leave"); }}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    expandedAction === "leave"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                      : "text-ink-3 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                  }`}
                  title="Uitstappen"
                  aria-expanded={expandedAction === "leave"}
                >
                  <UserMinus size={14} />
                </button>
              )}

              {canAct && !ride.is_full && (
                <Button
                  size="sm"
                  variant={expandedAction === "claim" ? "secondary" : "primary"}
                  className="ml-1 !min-h-[36px] !py-1.5"
                  onClick={(e) => { e.stopPropagation(); toggleAction("claim"); }}
                  aria-expanded={expandedAction === "claim"}
                >
                  <Plus size={13} />
                  Stap in
                </Button>
              )}
            </div>
          </div>

          {/* ── Inline stap-in / uitstappen panel — expands in place instead
              of a popup, so the ride's own details stay visible while you pick. ── */}
          <AnimatePresence initial={false}>
            {expandedAction && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2.5 border-t border-dashed border-line pt-2.5">
                  {expandedAction === "claim" ? (
                    <NamePicker
                      multiple
                      options={availableToJoin}
                      value={claimNames}
                      onChange={setClaimNames}
                      maxSelect={isPT ? undefined : ride.seats_left}
                      color="sky"
                    />
                  ) : (
                    <NamePicker multiple options={ride.passengers} value={leaveNames} onChange={setLeaveNames} color="rose" />
                  )}
                  <Button
                    variant={expandedAction === "leave" ? "danger" : "primary"}
                    className="w-full"
                    loading={expandedAction === "claim" ? claimMutation.isPending : leaveMutation.isPending}
                    disabled={(expandedAction === "claim" ? claimNames : leaveNames).length === 0}
                    onClick={expandedAction === "claim" ? handleClaim : handleLeave}
                  >
                    {expandedAction === "claim" ? (
                      <>
                        <Plus size={15} />
                        {claimNames.length === 0 ? "Selecteer een naam" : claimNames.length === 1 ? `${claimNames[0]} stapt in` : `${claimNames.length} personen stappen in`}
                      </>
                    ) : (
                      leaveNames.length === 0 ? "Selecteer een naam" : leaveNames.length === 1 ? `${leaveNames[0]} uitstappen` : `${leaveNames.length} personen uitstappen`
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {ride.parking_info && (
            <div className="flex items-start gap-2 rounded-lg bg-sunken px-3 py-2.5">
              <ParkingCircle size={13} className="mt-0.5 shrink-0 text-ink-3" />
              <div className="min-w-0">
                <p className="section-label mb-0.5">Parkeerinfo</p>
                <p className="text-xs leading-relaxed text-ink-2">{ride.parking_info}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
  );
}
