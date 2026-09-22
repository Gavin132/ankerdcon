import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, UserMinus } from "lucide-react";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { Collapse } from "../common/Collapse";
import { rideVehicleIcon } from "../../utils/rides";
import type { RestaurantDriver } from "../../types";
import { useActingPermissions, useUsers } from "../../hooks/useUsers";

interface CarCardProps {
  driver: RestaurantDriver;
  canAct: boolean;
  /** Everyone who could step into this car. */
  userNames: string[];
  onJoin: (driverName: string, names: string[]) => Promise<boolean>;
  onUnassign: (names: string[]) => Promise<boolean>;
  isPending: boolean;
}

/**
 * One car on a restaurant ride — laid out like a ride on the transport tab:
 * driver on top, riders as an avatar stack in the footer, and "Stap in" /
 * "Uitstappen" expanding in place instead of opening a popup.
 */
export function CarCard({ driver, canAct, userNames, onJoin, onUnassign, isPending }: CarCardProps) {
  const { actable } = useActingPermissions();
  const { data: users = [] } = useUsers();
  const [action, setAction] = useState<"join" | "leave" | null>(null);
  const [joinNames, setJoinNames] = useState<string[]>([]);
  const [leaveNames, setLeaveNames] = useState<string[]>([]);
  const [namesOpen, setNamesOpen] = useState(false);

  const spotsLeft = Math.max(0, driver.seats - driver.passengers.length);
  const isFull = spotsLeft === 0;
  const { Icon: CarIcon, small: smallVehicle } = rideVehicleIcon(driver.name, users, driver.seats);
  const available = userNames.filter((n) => n !== driver.name && !driver.passengers.includes(n));

  function toggle(next: "join" | "leave") {
    setAction((prev) => (prev === next ? null : next));
    setJoinNames([]);
    setLeaveNames([]);
  }

  async function submit() {
    const ok = action === "join" ? await onJoin(driver.name, joinNames) : await onUnassign(leaveNames);
    if (ok) toggle(action!);
  }

  const names = action === "join" ? joinNames : leaveNames;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="card-surface flex flex-col gap-2.5 p-3.5"
    >
      {/* ── Driver ── */}
      <div className="flex items-center gap-2.5">
        <UserAvatar name={driver.name} className="h-8 w-8 shrink-0 text-[11px]" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[14px] font-semibold text-ink">{driver.name}</span>
          <span className="flex items-center gap-1 text-[11.5px] text-ink-3">
            <CarIcon size={smallVehicle ? 10 : 12} className="shrink-0" />
            Chauffeur
          </span>
        </div>
      </div>

      {/* ── Footer: riders, actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-dashed border-line pt-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-2">
          {driver.passengers.length > 0 ? (
            <button
              type="button"
              onClick={() => setNamesOpen((v) => !v)}
              aria-expanded={namesOpen}
              title="Wie rijden er mee?"
              className="flex items-center gap-1 rounded-lg"
            >
              <span className="flex -space-x-1.5">
                {driver.passengers.slice(0, 6).map((p) => (
                  <UserAvatar key={p} name={p} className="h-6 w-6 text-[9px] !border-surface" />
                ))}
                {driver.passengers.length > 6 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-sunken font-mono text-[9px] font-semibold text-ink-2">
                    +{driver.passengers.length - 6}
                  </span>
                )}
              </span>
              <ChevronDown size={12} className={`text-ink-3 transition-transform ${namesOpen ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <span className="text-ink-3">Nog geen meerijders</span>
          )}
          <span className={isFull ? "font-semibold text-rose-700 dark:text-rose-300" : ""}>
            {isFull ? "Vol" : `${spotsLeft} vrij`}
          </span>
        </div>

        {canAct && (
          <div className="ml-auto flex items-center gap-1">
            {driver.passengers.length > 0 && (
              <button
                type="button"
                onClick={() => toggle("leave")}
                disabled={isPending}
                title="Uitstappen"
                aria-expanded={action === "leave"}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  action === "leave"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                    : "text-ink-3 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                }`}
              >
                <UserMinus size={14} />
              </button>
            )}
            {!isFull && (
              <Button
                size="sm"
                variant={action === "join" ? "secondary" : "primary"}
                className="ml-1 !min-h-[36px] !py-1.5"
                onClick={() => toggle("join")}
                aria-expanded={action === "join"}
              >
                <Plus size={13} />
                Stap in
              </Button>
            )}
          </div>
        )}
      </div>

      <Collapse open={namesOpen && driver.passengers.length > 0}>
        <p className="text-[12.5px] leading-snug text-ink-2">{driver.passengers.join(", ")}</p>
      </Collapse>

      {/* ── Inline stap-in / uitstappen panel ── */}
      <AnimatePresence initial={false}>
        {action && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 border-t border-dashed border-line pt-2.5">
              {action === "join" ? (
                <NamePicker multiple options={actable(available)} value={joinNames} onChange={setJoinNames} maxSelect={spotsLeft} color="sky" />
              ) : (
                <NamePicker multiple options={actable(driver.passengers)} value={leaveNames} onChange={setLeaveNames} color="rose" />
              )}
              <Button
                variant={action === "leave" ? "danger" : "primary"}
                className="w-full"
                loading={isPending}
                disabled={names.length === 0}
                onClick={submit}
              >
                {action === "join" ? (
                  <>
                    <Plus size={15} />
                    {names.length === 0 ? "Selecteer een naam" : names.length === 1 ? `${names[0]} stapt in` : `${names.length} personen stappen in`}
                  </>
                ) : names.length === 0 ? "Selecteer een naam" : names.length === 1 ? `${names[0]} uitstappen` : `${names.length} personen uitstappen`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
