import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Plus,
  UserMinus,
  AlertCircle,
  CheckCircle2,
  CalendarPlus,
  ArrowRight,
} from "lucide-react";
import { Button } from "../common/Button";
import { TripSheet } from "../trip/TripSheet";
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
import { useRestaurantCars } from "../../hooks/useRestaurantCars";
import { exportRideToIcs } from "../../utils/ics";
import { getRideStatus } from "../../utils/rides";
import { toast } from "../../store/toast.store";
import type { Meal, Ride, User } from "../../types";
import { useActingPermissions } from "../../hooks/useUsers";

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
  const { actable, canActFor } = useActingPermissions();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [assignPersonOpen, setAssignPersonOpen] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverSeats, setDriverSeats] = useState(5);
  const [leaveName, setLeaveName] = useState("");
  const [assignPersonName, setAssignPersonName] = useState("");
  const [assignPersonDriver, setAssignPersonDriver] = useState("");

  const addDriverMutation = useAddRestaurantDriver();
  const leaveDriverMutation = useLeaveRestaurantDriver();
  const claimMutation = useClaimSeat();
  const leaveSeatMutation = useLeaveSeat();
  const assignMutation = useAssignToDriver();
  const unassignMutation = useUnassignFromDriver();
  const cars = useRestaurantCars(ride, linkedMeal);

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

  const isMutating =
    addDriverMutation.isPending ||
    leaveDriverMutation.isPending ||
    claimMutation.isPending ||
    assignMutation.isPending ||
    unassignMutation.isPending;

  async function handleAddDriver() {
    if (!driverName.trim()) return;
    try {
      await cars.ensureOnMeal(driverName.trim());
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

  async function handleAssignPerson() {
    if (!assignPersonName || !assignPersonDriver) return;
    try {
      await cars.ensureOnMeal(assignPersonName);
      if (!attendees.includes(assignPersonName)) {
        await claimMutation.mutateAsync({ id: ride.id, payload: { user_name: assignPersonName } });
      }
      await assignMutation.mutateAsync({
        id: ride.id,
        payload: { user_name: assignPersonName, driver_name: assignPersonDriver },
      });
      toast("success", `${assignPersonName} rijdt mee met ${assignPersonDriver}`);
      setAssignPersonOpen(false);
      setAssignPersonName("");
      setAssignPersonDriver("");
    } catch {
      toast("error", "Kon niet toewijzen.");
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
          <div className="flex items-center gap-2 rounded-xl border-1.5 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle size={15} className="shrink-0" />
            {unassigned.length}{" "}
            {unassigned.length === 1 ? "persoon heeft" : "personen hebben"} nog
            geen rit — wijs ze toe!
          </div>
        )}
        {allClear && canAct && (
          <div className="flex items-center gap-2 rounded-xl border-1.5 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 size={15} className="shrink-0" />
            Iedereen heeft een rit — alles geregeld!
          </div>
        )}

        {/* Cars section */}
        <div className="card-surface overflow-hidden">
          <div className="space-y-4 px-4 py-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="whitespace-nowrap">
                <h2 className="section-label">
                  Auto's
                </h2>
                <p className="mt-0.5 whitespace-nowrap font-display text-[26px] font-extrabold leading-none text-ink">
                  {drivers.length}{" "}
                  <span className="font-sans text-sm font-semibold text-ink-3">
                    {drivers.length === 1 ? "auto" : "auto's"} beschikbaar
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {canAct && allParticipants.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setLeaveName("");
                      setLeaveOpen(true);
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-xl border-1.5 border-line px-3 text-xs font-semibold text-ink transition-colors hover:border-ink-3"
                  >
                    <UserMinus size={13} /> Afmelden
                  </button>
                )}
                {canAct && (
                  <button
                    type="button"
                    onClick={() => {
                      setDriverName("");
                      setDriverOpen(true);
                    }}
                    className="btn-primary h-9 px-3.5 text-xs"
                  >
                    <Car size={13} /> Ik rijd
                  </button>
                )}
              </div>
            </div>

            {/* Car cards */}
            {drivers.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
                  <Car size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Nog geen auto's aangemeld
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {drivers.map((d) => (
                    <CarCard
                      key={d.name}
                      driver={d}
                      canAct={canAct}
                      userNames={userNames}
                      onJoin={cars.join}
                      onUnassign={cars.unassign}
                      isPending={isMutating}
                    />
                  ))}
                  {canAct && (
                    <motion.button
                      key="add-car"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => {
                        setDriverName("");
                        setDriverOpen(true);
                      }}
                      className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-1.5 border-dashed border-line py-8
                                 text-ink-3 transition-colors hover:border-ink-3 hover:text-ink"
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
          <div className="space-y-3 rounded-xl border-1.5 border-dashed border-rose-300 bg-rose-50 px-4 py-3.5 dark:border-rose-400/40 dark:bg-rose-500/10">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-700 dark:text-rose-300" />
              <p className="text-sm font-semibold leading-tight text-rose-800 dark:text-rose-300">
                {unassigned.length}{" "}
                {unassigned.length === 1 ? "persoon heeft" : "personen hebben"}{" "}
                nog geen auto
              </p>
            </div>
            <div className="space-y-2">
              {unassigned.map((name) => (
                <div key={name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar name={name} className="h-6 w-6 shrink-0 text-[8px] !border-0" />
                    <span className="truncate text-sm font-semibold text-ink">{name}</span>
                  </div>
                  {canAct && drivers.length > 0 && canActFor(name) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignPersonName(name);
                        setAssignPersonDriver("");
                        setAssignPersonOpen(true);
                      }}
                      className="shrink-0 rounded-lg border-1.5 border-rose-300 bg-surface px-2.5 py-1 text-xs font-semibold text-rose-700 transition-colors hover:border-rose-500 dark:border-rose-400/40 dark:text-rose-300 dark:hover:border-rose-400"
                    >
                      Wijs toe
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar export */}
        <button
          onClick={() => exportRideToIcs(ride)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-1.5 border-line bg-surface px-4 py-3 text-xs font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
        >
          <CalendarPlus size={14} />
          Toevoegen aan kalender
        </button>
      </div>

      {/* Ik rijd */}
      <TripSheet
        open={driverOpen}
        onClose={() => {
          setDriverOpen(false);
          setDriverName("");
        }}
        title="Ik rijd"
        subtitle="Hoeveel mensen kun je meenemen?"
        footer={
          <Button
            onClick={handleAddDriver}
            loading={addDriverMutation.isPending || claimMutation.isPending}
            className="w-full"
            disabled={!driverName.trim()}
          >
            <Car size={15} />
            {driverName.trim() ? `${driverName} rijdt met ${driverSeats} plaatsen` : "Selecteer een naam"}
          </Button>
        }
      >
        <div className="space-y-4">
          <NamePicker options={actable(userNames)} value={driverName} onChange={setDriverName} color="sky" />
          <div>
            <label className="section-label mb-2 block">Totaal aantal plekken in je auto</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDriverSeats(n)}
                  aria-pressed={driverSeats === n}
                  className={`flex h-10 flex-1 items-center justify-center rounded-xl font-mono text-sm font-semibold tabular-nums transition-colors ${driverSeats === n ? "border-2 border-outline bg-brand text-brand-on" : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-3">Incl. de chauffeur</p>
          </div>
        </div>
      </TripSheet>

      {/* Afmelden */}
      <TripSheet
        open={leaveOpen}
        onClose={() => {
          setLeaveOpen(false);
          setLeaveName("");
        }}
        title="Afmelden"
        subtitle="Verwijder jezelf van de lijst"
        footer={
          <Button
            onClick={handleLeave}
            variant="danger"
            loading={leaveDriverMutation.isPending || leaveSeatMutation.isPending || unassignMutation.isPending}
            className="w-full"
            disabled={!leaveName.trim()}
          >
            {leaveName ? `${leaveName} afmelden` : "Selecteer een naam"}
          </Button>
        }
      >
        <NamePicker options={actable(allParticipants)} value={leaveName} onChange={setLeaveName} color="rose" />
      </TripSheet>

      {/* Wijs toe */}
      <TripSheet
        open={assignPersonOpen}
        onClose={() => { setAssignPersonOpen(false); setAssignPersonName(""); setAssignPersonDriver(""); }}
        title={`${assignPersonName} toewijzen`}
        subtitle="Kies een auto om deze persoon in te plaatsen"
        footer={
          <Button
            onClick={handleAssignPerson}
            loading={assignMutation.isPending || claimMutation.isPending}
            className="w-full"
            disabled={!assignPersonDriver}
          >
            <ArrowRight size={15} />
            {assignPersonDriver ? `${assignPersonName} → ${assignPersonDriver}` : "Selecteer een auto"}
          </Button>
        }
      >
        <div className="space-y-3">
          {drivers.map((d) => {
            const isFull = d.passengers.length >= d.seats;
            const isSelected = assignPersonDriver === d.name;
            return (
              <button
                key={d.name}
                type="button"
                disabled={isFull}
                onClick={() => setAssignPersonDriver(d.name)}
                aria-pressed={isSelected}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-1.5 border-outline bg-sunken"
                    : isFull
                    ? "cursor-not-allowed border-1.5 border-line opacity-50"
                    : "cursor-pointer border-1.5 border-line hover:border-ink-3"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Car size={14} className={isSelected ? "text-ink" : "text-ink-3"} />
                  <span className="font-semibold text-ink">{d.name}</span>
                </div>
                <span className={`font-mono text-xs font-semibold tabular-nums ${isFull ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {d.passengers.length}/{d.seats} {isFull ? "vol" : "vrij"}
                </span>
              </button>
            );
          })}
        </div>
      </TripSheet>
    </>
  );
}
