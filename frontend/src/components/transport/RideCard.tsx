import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Truck,
  Train,
  Clock,
  ParkingCircle,
  Plus,
  ExternalLink,
  ChevronDown,
  MapPin,
  Timer,
  AlertCircle,
  Map,
  Users,
  CalendarPlus,
} from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { useClaimSeat, useLeaveSeat } from "../../hooks/useRides";
import { useUsers } from "../../hooks/useUsers";
import { formatDateTime } from "../../utils/format";
import { parseRoute, buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
import { getRideStatus, formatCountdown } from "../../utils/rides";
import { exportRideToIcs } from "../../utils/ics";
import { UserAvatar } from "../common/UserAvatar";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import type { Ride } from "../../types";

interface RideCardProps {
  ride: Ride;
  userNames: string[];
}

export function RideCard({ ride, userNames }: RideCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [claimNames, setClaimNames] = useState<string[]>([]);
  const [leaveNames, setLeaveNames] = useState<string[]>([]);
  const [, tick] = useState(0);

  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();
  const { data: users = [] } = useUsers();

  function resolveName(stored: string) {
    return users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored))?.name ?? stored;
  }

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { status, minutesUntil } = getRideStatus(ride.departure_time);

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

  const isPT       = ride.is_public_transport;
  const isInbound  = ride.direction === "Inbound";
  const isTimo     = ride.driver.trim().toLowerCase().startsWith("timo");
  const isRecent   = status === "recent";
  const isPast     = status === "past";
  const canAct     = !isRecent && !isPast;

  const route     = parseRoute(ride.maps_link);
  const fromLabel = route?.origin      ?? (isInbound ? ride.start_location : "Con locatie");
  const toLabel   = route?.destination ?? (isInbound ? "Con locatie" : ride.start_location);
  const embedUrl  = route ? buildEmbedUrl(route.origin, route.destination) : buildEmbedUrl(ride.start_location);
  const openUrl   = buildMapsOpenUrl(ride.maps_link, ride.start_location);

  const resolvedPassengers = new Set(
    ride.passengers.map((p) => {
      const u = users.find((u) => u.name === p || u.discord_username === p || u.aliases?.includes(p));
      return u?.name ?? p;
    })
  );
  const availableToJoin = userNames.filter((n) => !resolvedPassengers.has(n));

  // Icon for transport type
  const TransportIcon = isPT ? Train : isTimo ? Truck : Car;

  const headerGradient = isPT
    ? "from-violet-500 to-purple-600"
    : status === "urgent"
    ? "from-rose-500 to-pink-600"
    : status === "soon"
    ? "from-amber-400 to-orange-500"
    : "from-sky-500 to-blue-600";

  return (
    <>
      <motion.div variants={listItem} className={isRecent || isPast ? "opacity-55" : ""}>
        <div className="card-surface rounded-2xl overflow-hidden">

          {/* ── Alert banners ───────────────────────────────────────────── */}
          {ride.action_required && !isPast && (
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertCircle size={12} />
              Actie vereist — reageer hieronder
            </div>
          )}

          {/* ── Gradient header with route track ────────────────────────── */}
          <div className={`relative bg-gradient-to-br ${headerGradient} px-4 pt-3 pb-3.5`}>
            {/* Route track + expand chevron */}
            <div className="flex items-center gap-3">
              {/* Transport icon */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <TransportIcon size={14} className="text-white" strokeWidth={2.5} />
              </div>

              {/* Visual track */}
              <div className="flex items-stretch gap-2 flex-1 min-w-0">
                <div className="flex flex-col items-center py-0.5 shrink-0">
                  <div className="h-2 w-2 rounded-full border-2 border-white/60 bg-white/30" />
                  <div className="my-1 w-px flex-1 bg-white/30" style={{ minHeight: "0.75rem" }} />
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
                <div className="flex flex-1 min-w-0 flex-col justify-between gap-1">
                  <p className="text-xs font-semibold text-white/70 leading-tight truncate">{fromLabel}</p>
                  <p className="text-sm font-black text-white leading-tight truncate">{toLabel}</p>
                </div>
              </div>

              {/* Time + chevron */}
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <div className={`flex items-center gap-1 rounded-lg bg-white/20 px-2 py-0.5 ${status === "urgent" ? "animate-pulse" : ""}`}>
                  <Clock size={10} className="text-white" />
                  <span className="text-[11px] font-bold text-white">{formatDateTime(ride.departure_time)}</span>
                </div>
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 active:bg-white/30 transition-colors"
                >
                  <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} />
                  </motion.div>
                </button>
              </div>
            </div>

            {/* Status ribbon (urgent/soon/recent) */}
            {(status === "urgent" || status === "soon" || status === "recent") && (
              <div className="mt-2 flex items-center gap-1.5 rounded-md bg-black/20 px-2 py-1 w-fit">
                {status === "recent" ? (
                  <Clock size={10} className="text-white/80" />
                ) : (
                  <Timer size={10} className="text-white/80" />
                )}
                <span className="text-[11px] font-bold text-white/90">
                  {status === "urgent" && `Vertrekt over ${formatCountdown(minutesUntil)}!`}
                  {status === "soon"   && `Vertrekt over ${formatCountdown(minutesUntil)}`}
                  {status === "recent" && "Vertrokken"}
                </span>
              </div>
            )}
          </div>

          {/* ── Card body ───────────────────────────────────────────────── */}
          <div className="px-4 py-3 space-y-3">

            {/* Driver row + seats badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {isPT ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                    <Train size={14} className="text-violet-600 dark:text-violet-400" />
                  </div>
                ) : (
                  <UserAvatar name={ride.driver} className="h-8 w-8 text-xs" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                    {isPT ? "Lijn / vervoerder" : "Chauffeur"}
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{resolveName(ride.driver)}</p>
                </div>
              </div>
              {!isPT && !isRecent && !isPast && (
                <div className={`shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                  ride.is_full
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                }`}>
                  <Users size={11} />
                  {ride.is_full ? "Vol" : `${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}
                </div>
              )}
            </div>

            {/* Seat progress bar (replaces plain divider for car rides) */}
            {!isPT && ride.total_seats < 99 ? (
              <div className="space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <motion.div
                    className={`h-full rounded-full ${ride.is_full ? "bg-rose-400" : "bg-sky-400"}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: (ride.total_seats - ride.seats_left) / ride.total_seats }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {ride.total_seats - ride.seats_left}
                  </span>
                  /{ride.total_seats} plekken bezet
                </p>
              </div>
            ) : (
              <div className="border-t border-slate-100 dark:border-slate-700/60" />
            )}

            {/* Passengers strip + stap-in CTA */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {ride.passengers.length > 0 ? (
                  <>
                    <div className="flex -space-x-1.5">
                      {ride.passengers.slice(0, 5).map((p) => (
                        <UserAvatar key={p} name={p} className="h-6 w-6 text-[9px]" />
                      ))}
                      {ride.passengers.length > 5 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-700 dark:text-slate-300">
                          +{ride.passengers.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      {ride.passengers.length} meerijder{ride.passengers.length !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">Nog geen meerijders</span>
                )}
              </div>
              {canAct && !ride.is_full && (
                <Button size="sm" onClick={() => { setClaimNames([]); setClaimOpen(true); }} className="shrink-0">
                  <Plus size={13} />
                  Stap in
                </Button>
              )}
            </div>

            {/* ── Expanded section ────────────────────────────────────── */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">

                    {/* Passengers detail */}
                    {ride.passengers.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                          <Users size={11} />
                          Meerijders
                        </p>
                        <div className="space-y-1">
                          {ride.passengers.map((p) => (
                            <div key={p} className="flex items-center gap-2.5">
                              <UserAvatar name={p} className="h-7 w-7 text-xs" />
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{resolveName(p)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parking info */}
                    {ride.parking_info && (
                      <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 dark:bg-slate-800/50 dark:border-slate-700">
                        <ParkingCircle size={15} className="shrink-0 text-sky-500 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Parkeerinfo</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{ride.parking_info}</p>
                        </div>
                      </div>
                    )}

                    {/* Map card */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin size={12} className="text-sky-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                            {fromLabel}{route ? ` → ${toLabel}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            onClick={() => setShowMap((v) => !v)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                              showMap
                                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                            }`}
                          >
                            <Map size={11} />
                            Kaart
                          </button>
                          <a
                            href={openUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-sky-600 transition-colors"
                          >
                            <ExternalLink size={11} />
                            Open
                          </a>
                        </div>
                      </div>
                      <AnimatePresence>
                        {showMap && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 200 }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <iframe
                              title="Kaart"
                              src={embedUrl}
                              className="w-full h-[200px] border-0 block border-t border-slate-100 dark:border-slate-700"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => exportRideToIcs(ride)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-500 active:text-sky-500 transition-colors"
                      >
                        <CalendarPlus size={12} />
                        Kalender
                      </button>
                      {canAct && ride.passengers.length > 0 && (
                        <button
                          onClick={() => { setLeaveNames([]); setLeaveOpen(true); }}
                          className="text-xs font-semibold text-slate-400 hover:text-rose-500 active:text-rose-500 transition-colors"
                        >
                          Uitstappen
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
          <NamePicker
            multiple
            options={availableToJoin}
            value={claimNames}
            onChange={setClaimNames}
            maxSelect={isPT ? undefined : ride.seats_left}
            color="sky"
          />
          <Button onClick={handleClaim} loading={claimMutation.isPending} className="w-full" disabled={claimNames.length === 0}>
            <Plus size={15} />
            {claimNames.length === 0
              ? "Selecteer een naam"
              : claimNames.length === 1
              ? `${claimNames[0]} stapt in`
              : `${claimNames.length} personen stappen in`}
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
          <NamePicker
            multiple
            options={ride.passengers}
            value={leaveNames}
            onChange={setLeaveNames}
            color="rose"
          />
          <Button onClick={handleLeave} variant="danger" loading={leaveMutation.isPending} className="w-full" disabled={leaveNames.length === 0}>
            {leaveNames.length === 0
              ? "Selecteer een naam"
              : leaveNames.length === 1
              ? `${leaveNames[0]} uitstappen`
              : `${leaveNames.length} personen uitstappen`}
          </Button>
        </div>
      </Modal>
    </>
  );
}
