import { useState } from "react";
import { ArrowRight, Users, ChevronDown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "../common/Modal";
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
    <Modal
      open={open}
      onClose={close}
      title="Meerijden"
      description={`Ritten voor ${event.event_name}`}
    >
      <div className="space-y-3">
        {/* Direction toggle */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
          {(["Inbound", "Outbound"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDirection(d); setSelectedRideId(null); }}
              className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                direction === d
                  ? "bg-white text-slate-900 shadow-card dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {event.is_hotel ? (d === "Inbound" ? "Naar congres" : "Naar hotel") : (d === "Inbound" ? "Heen" : "Terug")}
            </button>
          ))}
        </div>

        {matchingRides.length === 0 ? (
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Geen ritten gevonden voor deze richting.</p>
            <button
              type="button"
              onClick={onOfferInstead}
              className="mt-2 text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors"
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
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {group.label}
                    </span>
                    <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.15 }}>
                      <ChevronDown size={14} className="text-slate-400" />
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
                                className={`rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden ${isDeparted ? "opacity-80 grayscale-[50%]" : ""}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => { setSelectedRideId(isSelected ? null : ride.id); setJoinNames([]); }}
                                  disabled={ride.is_full || isDeparted}
                                  className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors ${
                                    ride.is_full || isDeparted
                                      ? "opacity-50 cursor-not-allowed"
                                      : isSelected
                                        ? "bg-sky-50 dark:bg-sky-500/10"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                  }`}
                                >
                                  <UserAvatar name={ride.driver} className="h-8 w-8 text-xs shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ride.driver}</p>
                                    <p className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                                      <span className="flex items-center gap-1 shrink-0">
                                        <Clock size={10} /> {formatTime(ride.departure_time)}
                                      </span>
                                      <span className="flex items-center gap-1 min-w-0 truncate">
                                        <ArrowRight size={10} className="shrink-0" /> {fromLabel}
                                      </span>
                                    </p>
                                  </div>
                                  <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    isDeparted
                                      ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                      : ride.is_full
                                        ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                                        : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                                  }`}>
                                    <Users size={10} />
                                    {isDeparted ? "Vertrokken" : ride.is_full ? "Vol" : `${ride.seats_left} vrij`}
                                  </span>
                                </button>

                                {isSelected && (
                                  <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-slate-100 dark:border-slate-800">
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
    </Modal>
  );
}
