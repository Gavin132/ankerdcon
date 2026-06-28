import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Truck,
  Users,
  Plus,
  ChevronDown,
  Timer,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Link2,
  Utensils,
  CalendarPlus,
  UserMinus,
  X,
} from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import {
  useClaimSeat,
  useLeaveSeat,
  useAddRestaurantDriver,
  useLeaveRestaurantDriver,
  useAssignToDriver,
  useUnassignFromDriver,
} from "../../hooks/useRides";
import { useCalendar } from "../../hooks/useCalendar";
import { useMeals } from "../../hooks/useMeals";
import { useUsers } from "../../hooks/useUsers";
import { formatDate, formatTime } from "../../utils/format";
import { getRideStatus, formatCountdown } from "../../utils/rides";
import { exportRideToIcs } from "../../utils/ics";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import type { Ride } from "../../types";

interface RestaurantCardProps {
  ride: Ride;
  userNames: string[];
}

export function RestaurantCard({ ride, userNames }: RestaurantCardProps) {
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);
  const [attendOpen, setAttendOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverSeats, setDriverSeats] = useState(4);
  const [attendNames, setAttendNames] = useState<string[]>([]);
  const [leaveName, setLeaveName] = useState("");
  const [joinNames, setJoinNames] = useState<string[]>([]);
  const [, tick] = useState(0);

  const addDriverMutation = useAddRestaurantDriver();
  const leaveDriverMutation = useLeaveRestaurantDriver();
  const claimMutation = useClaimSeat();
  const leaveSeatMutation = useLeaveSeat();
  const assignMutation = useAssignToDriver();
  const unassignMutation = useUnassignFromDriver();

  const { data: users = [] } = useUsers();
  const { data: events = [] } = useCalendar();
  const { data: meals = [] } = useMeals();

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { status, minutesUntil } = getRideStatus(ride.departure_time);
  const isPast = status === "past";
  const isRecent = status === "recent";
  const canAct = !isPast && !isRecent;

  const drivers = ride.restaurant_drivers ?? [];
  const attendees = ride.passengers;
  const driverNames = new Set(drivers.map((d) => d.name));
  const assignedPax = new Set(drivers.flatMap((d) => d.passengers));
  const unassigned = attendees.filter((a) => !driverNames.has(a) && !assignedPax.has(a));
  const totalCapacity = drivers.reduce((sum, d) => sum + d.seats, 0);
  const nonDriverAttendees = attendees.filter((a) => !driverNames.has(a));
  const hasGap = unassigned.length > 0 && drivers.length > 0;
  const allClear = drivers.length > 0 && nonDriverAttendees.length > 0 && unassigned.length === 0;
  const allParticipants = Array.from(new Set([...attendees, ...drivers.map((d) => d.name)]));

  const targetDriver = drivers.find((d) => d.name === joinTarget);
  const spotsInTarget = targetDriver ? targetDriver.seats - targetDriver.passengers.length : 0;

  const linkedMeal = ride.linked_meal_id ? meals.find((m) => m.id === ride.linked_meal_id) : undefined;
  const linkedEvent = ride.linked_event_id ? events.find((e) => e.id === ride.linked_event_id) : undefined;

  const isTimo = ride.driver.trim().toLowerCase().startsWith("timo");

  const statusBadge = status === "urgent" || status === "soon" || status === "recent";
  const statusBadgeClass =
    status === "urgent"
      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
      : status === "soon"
        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";

  function resolveName(stored: string) {
    return (
      users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored))?.name ?? stored
    );
  }

  async function handleAddDriver() {
    if (!driverName.trim()) return;
    try {
      await addDriverMutation.mutateAsync({ id: ride.id, payload: { user_name: driverName.trim(), seats: driverSeats } });
      if (!attendees.includes(driverName.trim())) {
        await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: driverName.trim() } });
      }
      toast("success", `${driverName.trim()} rijdt mee (${driverSeats} plaatsen)`);
      setDriverName("");
      setDriverOpen(false);
    } catch {
      toast("error", "Kon chauffeur niet registreren.");
    }
  }

  async function handleAttend() {
    if (attendNames.length === 0) return;
    try {
      for (const name of attendNames) {
        await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
      }
      toast("success", attendNames.length === 1 ? `${attendNames[0]} gaat mee!` : `${attendNames.length} personen gaan mee!`);
      setAttendNames([]);
      setAttendOpen(false);
    } catch {
      toast("error", "Kon aanmelding niet verwerken.");
    }
  }

  async function handleJoin() {
    if (joinNames.length === 0 || !joinTarget) return;
    try {
      for (const name of joinNames) {
        if (!attendees.includes(name)) {
          await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: name } });
        }
        await assignMutation.mutateAsync({ id: ride.id, payload: { user_name: name, driver_name: joinTarget } });
      }
      toast("success", joinNames.length === 1 ? `${joinNames[0]} rijdt mee met ${joinTarget}` : `${joinNames.length} personen rijden mee met ${joinTarget}`);
      setJoinNames([]);
      setJoinOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast("error", msg.includes("vol") ? `Auto van ${joinTarget} is vol!` : "Kon niet toewijzen.");
    }
  }

  async function handleUnassign(userName: string) {
    try {
      await unassignMutation.mutateAsync({ id: ride.id, payload: { user_name: userName } });
      toast("info", `${userName} verwijderd uit auto`);
    } catch {
      toast("error", "Kon niet verwijderen.");
    }
  }

  async function handleLeave() {
    if (!leaveName.trim()) return;
    const isDriver = driverNames.has(leaveName.trim());
    try {
      if (isDriver) {
        await leaveDriverMutation.mutateAsync({ id: ride.id, payload: { user_name: leaveName.trim() } });
      } else {
        await unassignMutation.mutateAsync({ id: ride.id, payload: { user_name: leaveName.trim() } });
      }
      await leaveSeatMutation.mutateAsync({ id: ride.id, payload: { user_name: leaveName.trim() } });
      toast("success", `${leaveName.trim()} afgemeld.`);
      setLeaveName("");
      setLeaveOpen(false);
    } catch {
      toast("error", "Kon afmelding niet verwerken.");
    }
  }

  return (
    <>
      <motion.div variants={listItem} className={isRecent || isPast ? "opacity-60" : ""}>
        <div className="card-surface rounded-2xl overflow-hidden">

          {/* Amber accent line */}
          <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />

          {/* Banners */}
          {hasGap && canAct && (
            <div className="flex items-center gap-2 border-b border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/25 px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-300">
              <AlertCircle size={12} className="shrink-0" />
              {unassigned.length} {unassigned.length === 1 ? "persoon heeft" : "personen hebben"} nog geen rit — wijs ze toe!
            </div>
          )}
          {!hasGap && ride.action_required && canAct && !allClear && (
            <div className="flex items-center gap-2 border-b border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/25 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
              <AlertCircle size={12} className="shrink-0" />
              Actie vereist — laat weten of je meekomt
            </div>
          )}
          {allClear && canAct && (
            <div className="flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/25 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={12} className="shrink-0" />
              Iedereen heeft een rit — alles geregeld!
            </div>
          )}

          {/* ── Top row ── */}
          <div className="px-4 pt-3.5 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-400">
                  <Utensils size={13} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Restaurant</span>
                {statusBadge && (
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass} ${status === "urgent" ? "animate-pulse" : ""}`}>
                    <Timer size={9} />
                    {status === "recent" ? "Vertrokken" : `Over ${formatCountdown(minutesUntil)}`}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(ride.departure_time)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatTime(ride.departure_time)}</p>
              </div>
            </div>
          </div>

          {/* ── Location + organizer ── */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center pt-1">
                <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Locatie</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ride.start_location}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <UserAvatar name={ride.driver} className="h-7 w-7 text-[11px]" />
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Organisator</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[90px]">{resolveName(ride.driver)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Chauffeurs ── */}
          <div className="px-4 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Chauffeurs {drivers.length > 0 && `(${drivers.length})`}
                {drivers.length > 0 && (
                  <span className="ml-2 text-slate-500 normal-case font-normal tracking-normal">
                    {assignedPax.size}/{totalCapacity} bezet
                  </span>
                )}
              </p>
              {canAct && (
                <button
                  onClick={() => { setDriverName(""); setDriverOpen(true); }}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors dark:text-amber-400"
                >
                  <Plus size={11} />
                  Ik rijd
                </button>
              )}
            </div>

            {drivers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nog geen chauffeurs — wie rijdt er?</p>
            ) : (
              <div className="space-y-2">
                {drivers.map((d) => {
                  const spotsLeft = d.seats - d.passengers.length;
                  const isFull = spotsLeft <= 0;
                  return (
                    <div key={d.name} className="rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
                        <div className="flex items-center gap-2">
                          {d.name.trim().toLowerCase().startsWith("timo") ? (
                            <Truck size={13} className="text-amber-500 shrink-0" />
                          ) : (
                            <Car size={13} className="text-amber-500 shrink-0" />
                          )}
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{d.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isFull ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>
                            {d.passengers.length}/{d.seats}
                          </span>
                        </div>
                        {canAct && !isFull && (
                          <button
                            onClick={() => { setJoinTarget(d.name); setJoinNames([]); setJoinOpen(true); }}
                            className="flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-600 hover:bg-sky-100 transition-colors dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50 min-h-[36px]"
                          >
                            Stap in <ArrowRight size={11} />
                          </button>
                        )}
                        {isFull && canAct && (
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Vol</span>
                        )}
                      </div>
                      <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                        {d.passengers.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">{spotsLeft} {spotsLeft === 1 ? "plek" : "plekken"} vrij</span>
                        ) : (
                          <>
                            {d.passengers.map((pax) => (
                              <button
                                key={pax}
                                onClick={() => canAct && handleUnassign(pax)}
                                disabled={!canAct || unassignMutation.isPending}
                                title={canAct ? "Klik om uit auto te verwijderen" : undefined}
                                className="group inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:cursor-default disabled:opacity-60 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                              >
                                {pax}
                                {canAct && <X size={9} className="opacity-0 transition-opacity group-hover:opacity-100" />}
                              </button>
                            ))}
                            {spotsLeft > 0 && (
                              <span className="self-center text-[11px] text-slate-400">+{spotsLeft} vrij</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Zonder rit */}
            {unassigned.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-900/15">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400">
                  Zonder rit ({unassigned.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unassigned.map((name) => (
                    <div key={name} className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 dark:border-rose-800/50 dark:bg-rose-900/25 dark:text-rose-400">
                      <AlertCircle size={10} />
                      {name}
                    </div>
                  ))}
                </div>
                {drivers.length === 0 && (
                  <p className="mt-2 text-xs text-rose-400">Voeg eerst een chauffeur toe</p>
                )}
              </div>
            )}
          </div>

          {/* ── Attendees toggle row ── */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => allParticipants.length > 0 && setAttendeesOpen((v) => !v)}
              className={`flex items-center gap-2 min-w-0 ${allParticipants.length > 0 ? "hover:opacity-75 transition-opacity" : "cursor-default"}`}
            >
              {allParticipants.length > 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {allParticipants.slice(0, 4).map((p) => (
                      <UserAvatar key={p} name={p} className="h-6 w-6 text-[9px] ring-2 ring-white dark:ring-[#1e293b]" />
                    ))}
                    {allParticipants.length > 4 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#1e293b] bg-slate-200 dark:bg-slate-600 text-[9px] font-bold text-slate-600 dark:text-slate-200">
                        +{allParticipants.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{allParticipants.length}</span> deelnemer{allParticipants.length !== 1 ? "s" : ""}
                  </span>
                  <motion.div animate={{ rotate: attendeesOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                    <ChevronDown size={11} className="text-slate-400" />
                  </motion.div>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
                  <Users size={11} />
                  Geen deelnemers
                </span>
              )}
            </button>

            {/* Linked meal or event badge */}
            {linkedMeal && (
              <Link
                to={routes.meal.view(linkedMeal.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors max-w-[140px]"
              >
                <Utensils size={10} className="shrink-0" />
                <span className="truncate">{linkedMeal.meal_name}</span>
              </Link>
            )}
            {!linkedMeal && linkedEvent && (
              <Link
                to={routes.event.view(linkedEvent.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-700/60 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors max-w-[140px]"
              >
                <Link2 size={10} className="shrink-0" />
                <span className="truncate">{linkedEvent.event_name}</span>
              </Link>
            )}
          </div>

          {/* Expanded attendees */}
          <AnimatePresence>
            {attendeesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {allParticipants.map((p) => (
                    <div key={p} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <UserAvatar name={p} className="h-4 w-4 text-[8px] !border-0" />
                      {resolveName(p)}
                      {driverNames.has(p) && (
                        <Car size={9} className="text-amber-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Action bar ── */}
          <div className="flex items-center gap-1.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-3 py-2">
            <Link
              to={routes.ride.view(ride.id)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Details <ArrowRight size={11} />
            </Link>

            <div className="flex-1" />

            <button
              onClick={() => exportRideToIcs(ride)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-amber-500 transition-colors"
              title="Exporteer naar kalender"
            >
              <CalendarPlus size={14} />
            </button>

            {canAct && allParticipants.length > 0 && (
              <button
                onClick={() => { setLeaveName(""); setLeaveOpen(true); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-rose-500 transition-colors"
                title="Afmelden"
              >
                <UserMinus size={14} />
              </button>
            )}

            {canAct && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setDriverName(""); setDriverOpen(true); }}
                >
                  <Car size={13} />
                  Ik rijd
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setAttendNames([]); setAttendOpen(true); }}
                >
                  <Users size={13} />
                  Ik ga mee
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Ik rijd modal */}
      <Modal
        open={driverOpen}
        onClose={() => { setDriverOpen(false); setDriverName(""); }}
        title="Ik rijd"
        description="Hoeveel mensen kun je meenemen?"
      >
        <div className="space-y-4">
          <NamePicker options={userNames} value={driverName} onChange={setDriverName} color="sky" />
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Beschikbare plaatsen
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDriverSeats(n)}
                  className={`flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-bold transition-all ${driverSeats === n ? "gradient-brand text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:text-slate-300"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleAddDriver}
            loading={addDriverMutation.isPending || claimMutation.isPending}
            className="w-full"
            disabled={!driverName.trim()}
          >
            <Car size={15} />
            {driverName.trim() ? `${driverName} rijdt met ${driverSeats} plaatsen` : "Selecteer een naam"}
          </Button>
        </div>
      </Modal>

      {/* Ik ga mee modal */}
      <Modal
        open={attendOpen}
        onClose={() => { setAttendOpen(false); setAttendNames([]); }}
        title="Ik ga mee"
        description={`Aanmelden voor ${ride.start_location}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Je wordt op de lijst gezet. Kies daarna een auto via <strong>Stap in</strong>.
          </p>
          <NamePicker multiple options={userNames} value={attendNames} onChange={setAttendNames} color="sky" />
          <Button
            onClick={handleAttend}
            loading={claimMutation.isPending}
            className="w-full"
            disabled={attendNames.length === 0}
          >
            <Users size={15} />
            {attendNames.length === 0 ? "Selecteer een naam" : attendNames.length === 1 ? `${attendNames[0]} gaat mee!` : `${attendNames.length} personen gaan mee!`}
          </Button>
        </div>
      </Modal>

      {/* Stap in modal */}
      <Modal
        open={joinOpen}
        onClose={() => { setJoinOpen(false); setJoinNames([]); }}
        title={`Stap in bij ${joinTarget}`}
        description={spotsInTarget > 0 ? `${spotsInTarget} ${spotsInTarget === 1 ? "plek" : "plekken"} beschikbaar` : ""}
      >
        <div className="space-y-4">
          <NamePicker
            multiple
            options={unassigned.length > 0 ? unassigned : userNames}
            value={joinNames}
            onChange={setJoinNames}
            maxSelect={spotsInTarget}
            color="sky"
            placeholder={unassigned.length > 0 ? "Zoek iemand zonder rit…" : "Zoek naam…"}
          />
          <Button
            onClick={handleJoin}
            loading={assignMutation.isPending || claimMutation.isPending}
            className="w-full"
            disabled={joinNames.length === 0}
          >
            <ArrowRight size={15} />
            {joinNames.length === 0 ? "Selecteer een naam" : joinNames.length === 1 ? `${joinNames[0]} stap in bij ${joinTarget}` : `${joinNames.length} personen stap in bij ${joinTarget}`}
          </Button>
        </div>
      </Modal>

      {/* Afmelden modal */}
      <Modal
        open={leaveOpen}
        onClose={() => { setLeaveOpen(false); setLeaveName(""); }}
        title="Afmelden"
        description="Verwijder jezelf van de lijst"
      >
        <div className="space-y-4">
          <NamePicker options={allParticipants} value={leaveName} onChange={setLeaveName} color="rose" />
          <Button
            onClick={handleLeave}
            variant="danger"
            loading={leaveDriverMutation.isPending || leaveSeatMutation.isPending || unassignMutation.isPending}
            className="w-full"
            disabled={!leaveName.trim()}
          >
            {leaveName ? `${leaveName} afmelden` : "Selecteer een naam"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
