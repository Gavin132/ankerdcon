import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Plus,
  AlertCircle,
  CheckCircle2,
  CalendarPlus,
  ArrowRight,
} from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { CarCard } from "./CarCard";
import {
  useClaimSeat,
  useLeaveSeat,
  useAddRestaurantDriver,
  useLeaveRestaurantDriver,
  useAssignToDriver,
  useUnassignFromDriver,
} from "../../hooks/useRides";
import { exportRideToIcs } from "../../utils/ics";
import { getRideStatus } from "../../utils/rides";
import { toast } from "../../store/toast.store";
import type { Meal, Ride, User } from "../../types";

interface Props {
  ride: Ride;
  userNames: string[];
  users: User[];
  linkedMeal?: Meal;
}

export function RestaurantDetailActions({
  ride,
  userNames,
  users: _users,
  linkedMeal,
}: Props) {
  const [driverOpen, setDriverOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverSeats, setDriverSeats] = useState(4);
  const [joinNames, setJoinNames] = useState<string[]>([]);
  const [leaveName, setLeaveName] = useState("");

  const addDriverMutation = useAddRestaurantDriver();
  const leaveDriverMutation = useLeaveRestaurantDriver();
  const claimMutation = useClaimSeat();
  const leaveSeatMutation = useLeaveSeat();
  const assignMutation = useAssignToDriver();
  const unassignMutation = useUnassignFromDriver();

  const { status } = getRideStatus(ride.departure_time);
  const canAct = status !== "past" && status !== "recent";

  const drivers = ride.restaurant_drivers ?? [];
  const attendees = linkedMeal ? (linkedMeal.participants ?? []) : ride.passengers;
  const driverNames = new Set(drivers.map((d) => d.name));
  const assignedPax = new Set(drivers.flatMap((d) => d.passengers));
  const unassigned = attendees.filter(
    (a) => !driverNames.has(a) && !assignedPax.has(a),
  );
  const allParticipants = Array.from(
    new Set([...attendees, ...drivers.map((d) => d.name)]),
  );

  const targetDriver = drivers.find((d) => d.name === joinTarget);
  const spotsInTarget = targetDriver
    ? targetDriver.seats - targetDriver.passengers.length
    : 0;

  const isMutating =
    addDriverMutation.isPending ||
    leaveDriverMutation.isPending ||
    claimMutation.isPending ||
    assignMutation.isPending ||
    unassignMutation.isPending;

  async function handleAddDriver() {
    if (!driverName.trim()) return;
    try {
      await addDriverMutation.mutateAsync({
        id: ride.id,
        payload: { user_name: driverName.trim(), seats: driverSeats },
      });
      if (!attendees.includes(driverName.trim())) {
        await claimMutation.mutateAsync({
          id: ride.id,
          payload: { user_name: driverName.trim() },
        });
      }
      toast(
        "success",
        `${driverName.trim()} rijdt mee (${driverSeats} plaatsen)`,
      );
      setDriverName("");
      setDriverOpen(false);
    } catch {
      toast("error", "Kon chauffeur niet registreren.");
    }
  }

  async function handleJoin() {
    if (joinNames.length === 0 || !joinTarget) return;
    try {
      for (const name of joinNames) {
        if (!attendees.includes(name)) {
          await claimMutation.mutateAsync({
            id: ride.id,
            payload: { user_name: name },
          });
        }
        await assignMutation.mutateAsync({
          id: ride.id,
          payload: { user_name: name, driver_name: joinTarget },
        });
      }
      toast(
        "success",
        joinNames.length === 1
          ? `${joinNames[0]} rijdt mee met ${joinTarget}`
          : `${joinNames.length} personen rijden mee met ${joinTarget}`,
      );
      setJoinNames([]);
      setJoinOpen(false);
    } catch {
      toast("error", "Kon niet toewijzen.");
    }
  }

  async function handleUnassign(userName: string) {
    try {
      await unassignMutation.mutateAsync({
        id: ride.id,
        payload: { user_name: userName },
      });
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
        await leaveDriverMutation.mutateAsync({
          id: ride.id,
          payload: { user_name: leaveName.trim() },
        });
      } else {
        await unassignMutation.mutateAsync({
          id: ride.id,
          payload: { user_name: leaveName.trim() },
        });
      }
      await leaveSeatMutation.mutateAsync({
        id: ride.id,
        payload: { user_name: leaveName.trim() },
      });
      toast("success", `${leaveName.trim()} afgemeld.`);
      setLeaveName("");
      setLeaveOpen(false);
    } catch {
      toast("error", "Kon afmelding niet verwerken.");
    }
  }

  const hasGap = unassigned.length > 0 && drivers.length > 0;
  const allClear =
    drivers.length > 0 &&
    attendees.filter((a) => !driverNames.has(a)).length > 0 &&
    unassigned.length === 0;

  return (
    <>
      <div className="space-y-4">
        {/* Status strip */}
        {hasGap && canAct && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <AlertCircle size={15} className="shrink-0" />
            {unassigned.length}{" "}
            {unassigned.length === 1 ? "persoon heeft" : "personen hebben"} nog
            geen rit — wijs ze toe!
          </div>
        )}
        {allClear && canAct && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={15} className="shrink-0" />
            Iedereen heeft een rit — alles geregeld!
          </div>
        )}

        {/* Cars section */}
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
          <div className="px-4 py-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Auto's
                </h2>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {drivers.length}{" "}
                  <span className="text-sm font-semibold text-slate-400">
                    {drivers.length === 1 ? "auto" : "auto's"} beschikbaar
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canAct && allParticipants.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLeaveName("");
                      setLeaveOpen(true);
                    }}
                  >
                    Afmelden
                  </Button>
                )}
                {canAct && (
                  <Button
                    onClick={() => {
                      setDriverName("");
                      setDriverOpen(true);
                    }}
                  >
                    <Car size={14} />
                    Ik rijd
                  </Button>
                )}
              </div>
            </div>

            {/* Car cards */}
            {drivers.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                  <Car size={26} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Nog geen auto's aangemeld
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Wie rijdt er mee naar {ride.start_location}?
                  </p>
                </div>
                {canAct && (
                  <Button
                    onClick={() => {
                      setDriverName("");
                      setDriverOpen(true);
                    }}
                  >
                    <Car size={15} />
                    Eerste auto aanmelden
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <AnimatePresence mode="popLayout">
                  {drivers.map((d) => (
                    <CarCard
                      key={d.name}
                      driver={d}
                      canAct={canAct}
                      onJoin={(name) => {
                        setJoinTarget(name);
                        setJoinNames([]);
                        setJoinOpen(true);
                      }}
                      onUnassign={handleUnassign}
                      isPending={isMutating}
                    />
                  ))}
                  {canAct && (
                    <motion.button
                      key="add-car"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setDriverName("");
                        setDriverOpen(true);
                      }}
                      className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700
                                 flex flex-col items-center justify-center gap-2 py-8
                                 text-slate-400 hover:border-amber-400 hover:text-amber-500
                                 dark:hover:border-amber-500 dark:hover:text-amber-400
                                 transition-colors cursor-pointer min-h-[100px]"
                    >
                      <Plus size={20} />
                      <span className="text-xs font-semibold">
                        Auto toevoegen
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Zonder rit strip */}
        {unassigned.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-3.5">
            <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-rose-800 dark:text-rose-300 leading-tight">
                {unassigned.length}{" "}
                {unassigned.length === 1 ? "persoon heeft" : "personen hebben"}{" "}
                nog geen auto
              </p>
              <div className="mt-1.5 flex -space-x-1.5">
                {unassigned.map((name) => (
                  <UserAvatar
                    key={name}
                    name={name}
                    className="h-6 w-6 text-[8px] ring-2 ring-white dark:ring-slate-900"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendar export */}
        <button
          onClick={() => exportRideToIcs(ride)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        >
          <CalendarPlus size={14} />
          Toevoegen aan kalender
        </button>
      </div>

      {/* Ik rijd modal */}
      <Modal
        open={driverOpen}
        onClose={() => {
          setDriverOpen(false);
          setDriverName("");
        }}
        title="Ik rijd"
        description="Hoeveel mensen kun je meenemen?"
      >
        <div className="space-y-4">
          <NamePicker
            options={userNames}
            value={driverName}
            onChange={setDriverName}
            color="sky"
          />
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
            {driverName.trim()
              ? `${driverName} rijdt met ${driverSeats} plaatsen`
              : "Selecteer een naam"}
          </Button>
        </div>
      </Modal>

      {/* Stap in modal */}
      <Modal
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          setJoinNames([]);
        }}
        title={`Stap in bij ${joinTarget}`}
        description={
          spotsInTarget > 0
            ? `${spotsInTarget} ${spotsInTarget === 1 ? "plek" : "plekken"} beschikbaar`
            : ""
        }
      >
        <div className="space-y-4">
          <NamePicker
            multiple
            options={userNames}
            value={joinNames}
            onChange={setJoinNames}
            maxSelect={spotsInTarget}
            color="sky"
          />
          <Button
            onClick={handleJoin}
            loading={assignMutation.isPending || claimMutation.isPending}
            className="w-full"
            disabled={joinNames.length === 0}
          >
            <ArrowRight size={15} />
            {joinNames.length === 0
              ? "Selecteer een naam"
              : joinNames.length === 1
                ? `${joinNames[0]} stap in bij ${joinTarget}`
                : `${joinNames.length} personen stap in bij ${joinTarget}`}
          </Button>
        </div>
      </Modal>

      {/* Afmelden modal */}
      <Modal
        open={leaveOpen}
        onClose={() => {
          setLeaveOpen(false);
          setLeaveName("");
        }}
        title="Afmelden"
        description="Verwijder jezelf van de lijst"
      >
        <div className="space-y-4">
          <NamePicker
            options={allParticipants}
            value={leaveName}
            onChange={setLeaveName}
            color="rose"
          />
          <Button
            onClick={handleLeave}
            variant="danger"
            loading={
              leaveDriverMutation.isPending ||
              leaveSeatMutation.isPending ||
              unassignMutation.isPending
            }
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
