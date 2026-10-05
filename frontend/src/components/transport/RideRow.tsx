import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronDown, ChevronRight, ParkingCircle, Plus, Timer, Trash2, UserMinus, Users } from "lucide-react";
import { Button } from "../common/Button";
import { Collapse } from "../common/Collapse";
import { NamePicker } from "../common/NamePicker";
import { useClaimSeat, useDeleteRide, useLeaveSeat } from "../../hooks/useRides";
import { useCalendar } from "../../hooks/useCalendar";
import { useCurrentUser, useUsers } from "../../hooks/useUsers";
import { formatTime } from "../../utils/format";
import { formatCountdown, getRideStatus, rideLocationLabel } from "../../utils/rides";
import { toast } from "../../store/toast.store";
import { routes } from "../../config/routes";
import type { CarGuidance } from "../../utils/carBalance";
import type { Ride } from "../../types";

/** The member's own ride. A deeper blue than the brand fill, so white text stays readable on it. */
const MINE_CLASS = "bg-[#0D75D1] text-white dark:bg-[#1A6FC9]";

const PILL = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold";

const rangeText = (g: CarGuidance) => (g.low === g.high ? `${g.low}` : `${g.low}–${g.high}`);

/** "Timo, Els en Noor" */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
}

/** Says how many this car should leave with, and whether it is on course. Advice only. */
function LoadPill({ guidance: g }: { guidance: CarGuidance }) {
  const tone =
    g.status === "short"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      : g.status === "ok"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        : "bg-sunken text-ink-2";
  const text =
    g.status === "short"
      ? `Nog ${g.low - g.load} nodig · doel ${rangeText(g)}`
      : g.status === "ok"
        ? `Op schema · doel ${rangeText(g)}`
        : `Boven doel · ${rangeText(g)}`;
  return (
    <span title="Zo vol moet deze auto vertrekken, zodat niemand achterblijft" className={`${PILL} ${tone}`}>
      <Users size={11} className="shrink-0" />
      {text}
    </span>
  );
}

interface RideRowProps {
  ride: Ride;
  userNames: string[];
  /** How full this car should leave (see utils/carBalance.ts). */
  guidance?: CarGuidance;
  /** The signed-in member is in this ride, as driver or passenger. */
  mine: boolean;
  expanded: boolean;
  onToggle: () => void;
  /** A driver may still take their ride back (the trip isn't over). */
  canDelete?: boolean;
}

/**
 * One ride in the Vervoer sheet: time, driver and where from on a single line,
 * with the rest (who rides along, parking, getting in or out) one tap away.
 */
export function RideRow({ ride, userNames, guidance, mine, expanded, onToggle, canDelete = false }: RideRowProps) {
  const [action, setAction] = useState<"claim" | "leave" | null>(null);
  const [claimNames, setClaimNames] = useState<string[]>([]);
  const [leaveNames, setLeaveNames] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, tick] = useState(0);

  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();
  const deleteMutation = useDeleteRide();
  const { data: users = [] } = useUsers();
  const { data: me } = useCurrentUser();
  const { data: events = [] } = useCalendar();

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!expanded) {
      setAction(null);
      setConfirmDelete(false);
    }
  }, [expanded]);

  const linkedEvent = ride.linked_event_id ? events.find((e) => e.id === ride.linked_event_id) : undefined;

  function resolveName(stored: string) {
    return users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored))?.name ?? stored;
  }

  const { status, minutesUntil } = getRideStatus(ride.departure_time);
  const isPT = ride.is_public_transport;
  const isInbound = ride.direction === "Inbound";
  const isRecent = status === "recent";
  const isPast = status === "past";
  const canAct = !isRecent && !isPast;
  const dim = ride.is_full || isRecent || isPast;
  const isMyRide = !!me && ride.driver === me.name;

  const fromLabel = rideLocationLabel(ride.start_location, linkedEvent, "Onbekende locatie");
  const toLabel = rideLocationLabel(ride.end_location, linkedEvent, "Bestemming");
  const sub = isInbound ? fromLabel : ride.end_location ? `Naar ${toLabel}` : `Vanaf ${fromLabel}`;

  const resolvedPassengers = new Set(ride.passengers.map(resolveName));
  const availableToJoin = userNames.filter((n) => !resolvedPassengers.has(n));
  const otherPassengers = ride.passengers.filter((p) => p !== ride.driver).map(resolveName);

  const seatsText = isPT ? `${ride.passengers.length} mee` : ride.is_full ? "Vol" : `${ride.seats_left} vrij`;
  const goalText = guidance && canAct && !isPT ? `doel ${rangeText(guidance)}` : null;
  const goalTone =
    guidance?.status === "short"
      ? "text-amber-800 dark:text-amber-300"
      : guidance?.status === "ok"
        ? "text-emerald-700 dark:text-emerald-300"
        : "text-ink-3";

  const statusPill = status === "urgent" || status === "soon" || status === "recent";
  const statusPillClass =
    status === "urgent"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : status === "soon"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
        : "bg-sunken text-ink-2";

  function openAction(next: "claim" | "leave") {
    const myName = me?.name;
    setAction(next);
    setClaimNames(next === "claim" && myName && availableToJoin.includes(myName) ? [myName] : []);
    const mineStored = myName ? ride.passengers.find((p) => resolveName(p) === myName) : undefined;
    setLeaveNames(next === "leave" && mineStored ? [mineStored] : []);
  }

  async function handleClaim() {
    if (claimNames.length === 0) return;
    try {
      for (const name of claimNames) {
        await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
      }
      setClaimNames([]);
      setAction(null);
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
      setAction(null);
      toast("success", leaveNames.length === 1 ? `${leaveNames[0]} is uitgestapt.` : `${leaveNames.length} personen uitgestapt.`);
    } catch {
      toast("error", "Kon je niet uitschrijven.");
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(ride.id);
      toast("success", "Rit verwijderd.");
    } catch {
      toast("error", "Kon de rit niet verwijderen. Probeer opnieuw.");
    }
  }

  const names = action === "claim" ? claimNames : leaveNames;

  return (
    <div className={isRecent || isPast ? "opacity-70" : ""}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors ${mine ? MINE_CLASS : "hover:bg-sunken"}`}
      >
        <span
          className={`w-[62px] shrink-0 font-display text-[28px] font-extrabold leading-[0.95] tabular-nums ${
            mine ? "" : dim ? "text-ink-3" : "text-ink-2"
          }`}
        >
          {formatTime(ride.departure_time)}
        </span>
        <span className="min-w-0 flex-1 leading-[1.3]">
          <span className={`block truncate text-[14px] font-semibold ${mine ? "" : "text-ink-2"}`}>{resolveName(ride.driver)}</span>
          <span className={`block truncate text-[12px] ${mine ? "text-white/85" : "text-ink-3"}`}>{sub}</span>
        </span>
        <span className="shrink-0 text-right leading-[1.3]">
          <span className={`block text-[12px] ${ride.is_full ? "font-semibold" : ""} ${mine ? "text-white/90" : "text-ink-2"}`}>{seatsText}</span>
          {goalText && <span className={`block text-[11px] font-semibold ${mine ? "text-white" : goalTone}`}>{goalText}</span>}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""} ${mine ? "text-white/85" : "text-ink-3"}`}
        />
      </button>

      <Collapse open={expanded}>
        <div className="space-y-2.5 pb-4 pl-[92px] pr-4 pt-3 text-[12.5px] text-ink-2">
          {((guidance && canAct && !isPT) || statusPill || (ride.action_required && !isPast)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {guidance && canAct && !isPT && <LoadPill guidance={guidance} />}
              {statusPill && (
                <span className={`${PILL} ${statusPillClass}`}>
                  <Timer size={11} />
                  {status === "recent" ? "Vertrokken" : `Over ${formatCountdown(minutesUntil)}`}
                </span>
              )}
              {ride.action_required && !isPast && (
                <span className={`${PILL} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`}>
                  <AlertCircle size={11} className="shrink-0" />
                  Actie vereist
                </span>
              )}
            </div>
          )}

          <div className="flex items-start gap-2">
            <Users size={13} className="mt-0.5 shrink-0 text-ink-3" />
            <span>
              {otherPassengers.length > 0
                ? `${joinNames(otherPassengers)} ${otherPassengers.length === 1 ? "rijdt" : "rijden"} mee`
                : "Nog geen meerijders"}
            </span>
          </div>

          {ride.parking_info && (
            <div className="flex items-start gap-2">
              <ParkingCircle size={13} className="mt-0.5 shrink-0 text-ink-3" />
              <span>{ride.parking_info}</span>
            </div>
          )}

          {canAct && (
            <div className="space-y-2.5 pt-1">
              {action ? (
                <>
                  {action === "claim" ? (
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
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setAction(null)}>
                      Annuleer
                    </Button>
                    <Button
                      size="sm"
                      variant={action === "leave" ? "danger" : "primary"}
                      className="min-w-0 flex-1"
                      loading={action === "claim" ? claimMutation.isPending : leaveMutation.isPending}
                      disabled={names.length === 0}
                      onClick={action === "claim" ? handleClaim : handleLeave}
                    >
                      {action === "claim" ? <Plus size={15} /> : <UserMinus size={15} />}
                      {names.length === 0
                        ? "Selecteer een naam"
                        : action === "claim"
                          ? names.length === 1 ? `${names[0]} stapt in` : `${names.length} personen stappen in`
                          : names.length === 1 ? `${names[0]} uitstappen` : `${names.length} personen uitstappen`}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {!ride.is_full && (
                    <Button size="sm" className="flex-1" onClick={() => openAction("claim")}>
                      <Plus size={14} />
                      Stap in
                    </Button>
                  )}
                  {ride.passengers.length > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => openAction("leave")}>
                      <UserMinus size={14} />
                      Uitstappen
                    </Button>
                  )}
                </div>
              )}

              {isMyRide && canDelete && !action && (
                <div>
                  {confirmDelete ? (
                    <div className="space-y-1.5">
                      {otherPassengers.length > 0 && (
                        <p className="text-[11.5px] text-rose-600 dark:text-rose-400">
                          {otherPassengers.length === 1
                            ? "Er is al iemand bij deze rit ingedeeld — die persoon verliest zijn plek."
                            : `Er zijn al ${otherPassengers.length} mensen bij deze rit ingedeeld — zij verliezen hun plek.`}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="h-8 rounded-lg px-2 text-xs font-semibold text-ink-2 hover:text-ink"
                        >
                          Annuleer
                        </button>
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={handleDelete}
                          className="flex h-8 items-center gap-1 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                        >
                          <Trash2 size={13} /> Zeker weten?
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex h-8 items-center gap-1 rounded-lg border-1.5 border-line px-3 text-xs font-semibold text-ink-2 transition-colors hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
                    >
                      <Trash2 size={13} /> Rit verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <Link
            to={routes.ride.view(ride.id)}
            className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-brand-text hover:underline"
          >
            Bekijk rit <ChevronRight size={13} />
          </Link>
        </div>
      </Collapse>
    </div>
  );
}
