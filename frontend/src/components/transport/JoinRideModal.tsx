import { useState } from "react";
import { ArrowRight, Users, ChevronDown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { useRides, useClaimSeat } from "../../hooks/useRides";
import { useUsers } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { toast } from "../../store/toast.store";
import { rideLocationLabel, groupRidesByDay } from "../../utils/rides";
import { parseEventDate, toDateKey } from "../../utils/date";
import { formatTime } from "../../utils/format";
import { getNow } from "../../store/time.store";
import type { CalendarEvent, Direction } from "../../types";

interface JoinRideModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  initialDirection: Direction;
  /** Switch over to the "offer a ride" flow instead, e.g. when nothing matches. */
  onOfferInstead: () => void;
}

export function JoinRideModal({ open, onClose, event, initialDirection, onOfferInstead }: JoinRideModalProps) {
  const { data: rides = [] } = useRides();
  const { data: users = [] } = useUsers();
  const { data: allEvents = [] } = useCalendar();
  const claimMutation = useClaimSeat();

  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [joinNames, setJoinNames] = useState<string[]>([]);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  function toggleDay(label: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function close() {
    setSelectedRideId(null);
    setJoinNames([]);
    onClose();
  }

  // Match rides across every day of this (possibly multi-day) event, not
  // just the one day the user happens to be looking at — a ride offered for
  // day 2 of a con is just as relevant from day 1's hub tile.
  const groupDays = event.multi_day_id
    ? allEvents.filter((e) => e.multi_day_id === event.multi_day_id)
    : [event];
  const groupDateKeys = new Set(
    groupDays
      .map((e) => parseEventDate(e.date))
      .filter((d): d is Date => d !== null)
      .map(toDateKey),
  );

  const matchingRides = rides
    .filter((r) => r.direction === direction)
    .filter((r) => {
      const dep = new Date(r.departure_time.replace(" ", "T"));
      return !isNaN(dep.getTime()) && groupDateKeys.has(toDateKey(dep));
    })
    .filter((r) => {
      const dep = new Date(r.departure_time.replace(" ", "T"));
      const minutesSinceDeparture = (getNow().getTime() - dep.getTime()) / 60000;
      // Still shown up to an hour after departure (grayed out below), then
      // dropped entirely — no point offering a ride that's long gone.
      return minutesSinceDeparture < 60;
    })
    .sort((a, b) => a.departure_time.localeCompare(b.departure_time));

  async function handleJoin(rideId: string) {
    if (joinNames.length === 0) return;
    try {
      for (const name of joinNames) {
        await claimMutation.mutateAsync({ id: rideId, payload: { user_name: name } });
      }
      toast("success", joinNames.length === 1 ? `${joinNames[0]} staat in de rit!` : `${joinNames.length} personen staan in de rit!`);
      close();
    } catch {
      toast("error", "Kon plek niet claimen. Probeer opnieuw.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={close}
      title="Meerijden"
      subtitle={`Ritten voor ${event.event_name}`}
    >
      <div className="space-y-3">
        {/* Direction toggle */}
        <div className="flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]">
          {(["Inbound", "Outbound"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDirection(d); setSelectedRideId(null); }}
              aria-pressed={direction === d}
              className={`flex-1 rounded-[7px] px-3 py-2 text-[13px] font-semibold transition-colors ${
                direction === d
                  ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {event.is_hotel ? (d === "Inbound" ? "Naar congres" : "Naar hotel") : (d === "Inbound" ? "Heen" : "Terug")}
            </button>
          ))}
        </div>

        {matchingRides.length === 0 ? (
          <div className="rounded-xl border-1.5 border-line bg-sunken px-4 py-6 text-center">
            <p className="text-sm text-ink-2">Geen ritten gevonden voor deze richting.</p>
            <button
              type="button"
              onClick={onOfferInstead}
              className="mt-2 text-xs font-semibold text-brand-text hover:underline"
            >
              Zelf een rit aanbieden?
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groupRidesByDay(matchingRides).map((group) => {
              const isCollapsed = collapsedDays.has(group.label);
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggleDay(group.label)}
                    className="flex w-full items-center justify-between gap-2 py-1 text-left"
                  >
                    <span className="section-label">
                      {group.label}
                    </span>
                    <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.15 }}>
                      <ChevronDown size={14} className="text-ink-3" />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-1">
                          {group.rides.map((ride) => {
                            const resolvedPassengers = new Set(
                              ride.passengers.map((p) => users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p))?.name ?? p),
                            );
                            const availableToJoin = users.map((u) => u.name).filter((n) => !resolvedPassengers.has(n));
                            const isSelected = selectedRideId === ride.id;
                            const fromLabel = rideLocationLabel(ride.start_location, event, "Onbekende locatie");
                            const dep = new Date(ride.departure_time.replace(" ", "T"));
                            const isDeparted = !isNaN(dep.getTime()) && dep.getTime() < getNow().getTime();

                            return (
                              <div
                                key={ride.id}
                                className={`overflow-hidden rounded-xl border-1.5 bg-surface ${isSelected ? "border-ink-3" : "border-line"} ${isDeparted ? "opacity-70" : ""}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => { setSelectedRideId(isSelected ? null : ride.id); setJoinNames([]); }}
                                  disabled={ride.is_full || isDeparted}
                                  className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                                    ride.is_full || isDeparted
                                      ? "opacity-50 cursor-not-allowed"
                                      : isSelected
                                        ? "bg-sunken"
                                        : "hover:bg-sunken"
                                  }`}
                                >
                                  <UserAvatar name={ride.driver} className="h-8 w-8 text-xs shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">{ride.driver}</p>
                                    <p className="flex items-center gap-2.5 truncate text-xs text-ink-2">
                                      <span className="flex shrink-0 items-center gap-1 font-mono font-semibold tabular-nums text-ink">
                                        <Clock size={10} /> {formatTime(ride.departure_time)}
                                      </span>
                                      <span className="flex items-center gap-1 min-w-0 truncate">
                                        <ArrowRight size={10} className="shrink-0" /> {fromLabel}
                                      </span>
                                    </p>
                                  </div>
                                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                                    isDeparted
                                      ? "bg-sunken text-ink-2"
                                      : ride.is_full
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                  }`}>
                                    <Users size={10} />
                                    {isDeparted ? "Vertrokken" : ride.is_full ? "Vol" : `${ride.seats_left} vrij`}
                                  </span>
                                </button>

                                {isSelected && (
                                  <div className="space-y-2.5 border-t border-line px-3.5 pb-3.5 pt-3">
                                    <NamePicker
                                      multiple
                                      options={availableToJoin}
                                      value={joinNames}
                                      onChange={setJoinNames}
                                      maxSelect={ride.seats_left}
                                      color="sky"
                                    />
                                    <Button
                                      onClick={() => handleJoin(ride.id)}
                                      loading={claimMutation.isPending}
                                      className="w-full"
                                      disabled={joinNames.length === 0}
                                    >
                                      {joinNames.length === 0 ? "Selecteer een naam" : joinNames.length === 1 ? `${joinNames[0]} stapt in` : `${joinNames.length} personen stappen in`}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TripSheet>
  );
}
