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
  ArrowRight,
  MapPin,
  Timer,
  AlertCircle,
  Map,
  Users,
} from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { useClaimSeat, useLeaveSeat } from "../../hooks/useRides";
import { formatDateTime } from "../../utils/format";
import { parseRoute, buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
import { getRideStatus, formatCountdown } from "../../utils/rides";
import { avatarColor } from "../../utils/avatar";
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
  const [leaveName, setLeaveName] = useState("");
  const [, tick] = useState(0);

  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { status, minutesUntil } = getRideStatus(ride.departure_time);

  async function handleClaim() {
    if (claimNames.length === 0) return;
    try {
      for (const name of claimNames) {
        await claimMutation.mutateAsync({ rowNumber: ride.row_number, payload: { user_name: name } });
      }
      setClaimNames([]);
      setClaimOpen(false);
      toast("success", claimNames.length === 1 ? `${claimNames[0]} staat in de rit!` : `${claimNames.length} personen staan in de rit!`);
    } catch {
      toast("error", "Kon plek niet claimen. Probeer opnieuw.");
    }
  }

  async function handleLeave() {
    if (!leaveName.trim()) return;
    try {
      await leaveMutation.mutateAsync({ rowNumber: ride.row_number, payload: { user_name: leaveName.trim() } });
      setLeaveName("");
      setLeaveOpen(false);
      toast("success", `${leaveName.trim()} is uitgestapt.`);
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

  const availableToJoin = userNames.filter((n) => !ride.passengers.includes(n));

  // Icon for transport type
  const TransportIcon = isPT ? Train : isTimo ? Truck : Car;
  const iconBg = isPT
    ? "bg-gradient-to-br from-violet-400 to-purple-500"
    : "gradient-brand";

  // Status accent
  const statusBorderClass =
    status === "urgent" ? "border-l-4 border-l-rose-400" :
    status === "soon"   ? "border-l-4 border-l-amber-400" :
    status === "recent" ? "border-l-4 border-l-slate-300 dark:border-l-slate-600" :
    "";

  const clockColor =
    status === "urgent" ? "text-rose-400" :
    status === "soon"   ? "text-amber-400" :
    "text-sky-400";

  return (
    <>
      <motion.div variants={listItem} className={isRecent || isPast ? "opacity-60" : ""}>
        <div className={`card-surface rounded-2xl overflow-hidden ${statusBorderClass}`}>

          {/* ── Banners ─────────────────────────────────────────────────── */}
          {ride.action_required && !isPast && (
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertCircle size={12} />
              Actie vereist — reageer hieronder
            </div>
          )}
          {status === "urgent" && (
            <div className="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 dark:border-rose-900/30 dark:bg-rose-900/20">
              <Timer size={12} />
              Vertrekt over {formatCountdown(minutesUntil)}!
            </div>
          )}
          {status === "soon" && (
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-600 dark:border-amber-900/30 dark:bg-amber-900/20">
              <Timer size={12} />
              Vertrekt over {formatCountdown(minutesUntil)}
            </div>
          )}
          {status === "recent" && (
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800/60">
              <Clock size={12} />
              Vertrokken
            </div>
          )}

          <div className="p-4 space-y-3">

            {/* ── Main row: icon + route + chevron ────────────────────── */}
            <div className="flex items-center gap-3">
              {/* Transport icon */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <TransportIcon size={18} className="text-white" strokeWidth={2} />
              </div>

              {/* Route — primary content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate">{fromLabel}</span>
                  <ArrowRight size={13} className="text-sky-400 shrink-0" />
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate">{toLabel}</span>
                </div>
                {/* Driver + time */}
                <div className="mt-1 flex items-center gap-1.5">
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-black text-white ${avatarColor(ride.driver)}`}>
                    {ride.driver[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{ride.driver}</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <Clock size={10} className={`shrink-0 ${clockColor}`} />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{formatDateTime(ride.departure_time)}</span>
                </div>
              </div>

              {/* Expand */}
              <button
                onClick={() => setExpanded((e) => !e)}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all dark:hover:bg-slate-700"
              >
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} />
                </motion.div>
              </button>
            </div>

            {/* ── Passenger strip + seat pill ─────────────────────────── */}
            {!isPT && (
              <div className="flex items-center justify-between">
                {/* Passenger avatar stack */}
                <div className="flex items-center gap-2">
                  {ride.passengers.length > 0 ? (
                    <>
                      <div className="flex -space-x-1.5">
                        {ride.passengers.slice(0, 5).map((p) => (
                          <div
                            key={p}
                            title={p}
                            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-[9px] font-black text-white dark:border-slate-800 ${avatarColor(p)}`}
                          >
                            {p[0].toUpperCase()}
                          </div>
                        ))}
                        {ride.passengers.length > 5 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-700 dark:text-slate-300">
                            +{ride.passengers.length - 5}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {ride.passengers.length} meerijder{ride.passengers.length !== 1 ? "s" : ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Nog geen meerijders</span>
                  )}
                </div>

                {/* Seat pill */}
                {!isRecent && (
                  <div className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold ${
                    ride.is_full
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  }`}>
                    <Users size={11} />
                    {ride.is_full
                      ? "Vol"
                      : `${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}
                  </div>
                )}
              </div>
            )}

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
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-black text-white ${avatarColor(p)}`}>
                                {p[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p}</span>
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

                    {/* Actions */}
                    {!isPT && canAct && (
                      <div className="flex items-center justify-between pt-1">
                        {ride.passengers.length > 0 ? (
                          <button
                            onClick={() => { setLeaveName(""); setLeaveOpen(true); }}
                            className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            Uitstappen
                          </button>
                        ) : <span />}
                        {!ride.is_full && (
                          <Button size="sm" onClick={() => { setClaimNames([]); setClaimOpen(true); }}>
                            <Plus size={14} />
                            Stap in
                          </Button>
                        )}
                      </div>
                    )}
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
        description={`${fromLabel} → ${toLabel} · ${ride.seats_left} ${ride.seats_left === 1 ? "plek" : "plekken"} vrij`}
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={availableToJoin}
            value={claimNames}
            onChange={setClaimNames}
            maxSelect={ride.seats_left}
            color="sky"
          />
          <Button onClick={handleClaim} loading={claimMutation.isPending} className="w-full" disabled={claimNames.length === 0}>
            <Plus size={15} />
            {claimNames.length === 0
              ? "Selecteer een naam"
              : claimNames.length === 1
              ? `${claimNames[0]} stap in`
              : `${claimNames.length} personen stap in`}
          </Button>
        </div>
      </Modal>

      {/* Uitstappen modal */}
      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Uitstappen"
        description="Wie stapt er uit?"
      >
        <div className="space-y-3">
          <NamePicker
            options={ride.passengers}
            value={leaveName}
            onChange={setLeaveName}
            color="rose"
          />
          <Button onClick={handleLeave} variant="danger" loading={leaveMutation.isPending} className="w-full" disabled={!leaveName.trim()}>
            {leaveName ? `${leaveName} uitstappen` : "Selecteer een naam"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
