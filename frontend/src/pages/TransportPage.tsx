import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Truck,
  Train,
  Clock,
  Users,
  ParkingCircle,
  Plus,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  MapPin,
  History,
  Timer,
  Utensils,
  AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { SearchSelect } from "../components/common/SearchSelect";
import { useRides, useCreateRide, useClaimSeat, useLeaveSeat } from "../hooks/useRides";
import { useUsers } from "../hooks/useUsers";
import { formatDateTime } from "../utils/format";
import { toast } from "../store/toast.store";
import type { Direction, VehicleType, Ride } from "../types";
import { DIRECTIONS } from "../constants";

const enc = encodeURIComponent;

const createSchema = z.object({
  direction: z.enum(["Inbound", "Outbound", "Restaurant"]),
  vehicle_type: z.enum(["Car", "Public Transport"]),
  driver: z.string().min(1, "Verplicht"),
  departure_time: z.string().min(1, "Verplicht"),
  start_location: z.string().min(1, "Verplicht"),
  end_location: z.string().optional(),
  total_seats: z.coerce.number().min(1).max(99),
  parking_info: z.string().optional(),
  car_available: z.boolean().optional(),
  action_required: z.boolean().optional(),
});

const nameSchema = z.object({
  user_name: z.string().min(1, "Vul je naam in"),
});

type CreateForm = z.infer<typeof createSchema>;
type NameForm = z.infer<typeof nameSchema>;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const cardItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

function parseRoute(mapsLink: string): { origin: string; destination: string } | null {
  if (!mapsLink) return null;
  try {
    const url = new URL(mapsLink);
    const origin = url.searchParams.get("origin");
    const destination = url.searchParams.get("destination");
    if (origin && destination) return { origin, destination };
  } catch {
    // ignore malformed URLs
  }
  return null;
}

function buildEmbedUrl(start: string, end?: string): string {
  if (end && end.trim()) {
    return `https://maps.google.com/maps?saddr=${enc(start)}&daddr=${enc(end)}&output=embed`;
  }
  return `https://maps.google.com/maps?q=${enc(start)}&output=embed`;
}

// ---------------------------------------------------------------------------
// Ride status helpers
// ---------------------------------------------------------------------------

type RideStatus = "upcoming" | "soon" | "urgent" | "recent" | "past";

function getRideStatus(departureTime: string): { status: RideStatus; minutesUntil: number } {
  const dep = new Date(departureTime.replace(" ", "T")).getTime();
  if (isNaN(dep)) return { status: "upcoming", minutesUntil: Infinity };
  const minutesUntil = (dep - Date.now()) / 60000;
  if (minutesUntil > 120) return { status: "upcoming", minutesUntil };
  if (minutesUntil > 30) return { status: "soon", minutesUntil };
  if (minutesUntil > 0) return { status: "urgent", minutesUntil };
  if (minutesUntil > -120) return { status: "recent", minutesUntil };
  return { status: "past", minutesUntil };
}

function formatCountdown(minutes: number): string {
  const m = Math.ceil(minutes);
  if (m >= 60) return `${Math.floor(m / 60)}u ${m % 60}m`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Route preview in the create form (debounced)
// ---------------------------------------------------------------------------

function RoutePreview({ start, end }: { start: string; end: string }) {
  const [committed, setCommitted] = useState({ start: "", end: "" });

  useEffect(() => {
    if (!start.trim()) {
      setCommitted({ start: "", end: "" });
      return;
    }
    const t = setTimeout(() => setCommitted({ start: start.trim(), end: end.trim() }), 900);
    return () => clearTimeout(t);
  }, [start, end]);

  if (!committed.start) return null;

  const src = buildEmbedUrl(committed.start, committed.end || undefined);
  const label = committed.end ? "Route preview" : "Locatie preview";

  return (
    <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-100">
      <iframe
        key={src}
        title={label}
        src={src}
        className="w-full h-36 border-0 block"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 pointer-events-none">
        <MapPin size={10} className="text-sky-500" />
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seat dots
// ---------------------------------------------------------------------------

function SeatDots({ total, left }: { total: number; left: number }) {
  const taken = total - left;
  const dots = Math.min(total, 8);
  return (
    <div className="flex gap-1">
      {Array.from({ length: dots }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i < taken ? "bg-rose-400" : "bg-emerald-400"
          }`}
        />
      ))}
      {total > 8 && <span className="text-xs text-slate-400">+{total - 8}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ride card
// ---------------------------------------------------------------------------

function RideCard({ ride, userNames }: { ride: Ride; userNames: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [, tick] = useState(0);
  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();
  const claimForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const leaveForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const claimName = claimForm.watch("user_name") ?? "";
  const leaveName = leaveForm.watch("user_name") ?? "";

  // Re-render every 30 s so countdown stays live
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { status, minutesUntil } = getRideStatus(ride.departure_time);

  async function onClaim(values: NameForm) {
    try {
      await claimMutation.mutateAsync({ rowNumber: ride.row_number, payload: values });
      claimForm.reset();
      setClaimOpen(false);
      toast("success", "Plek geclaimd! Je staat in de rit.");
    } catch {
      toast("error", "Kon plek niet claimen. Probeer opnieuw.");
    }
  }

  async function onLeave(values: NameForm) {
    try {
      await leaveMutation.mutateAsync({ rowNumber: ride.row_number, payload: values });
      leaveForm.reset();
      setLeaveOpen(false);
      toast("success", "Je bent uitgestapt uit de rit.");
    } catch {
      toast("error", "Kon je niet uitschrijven.");
    }
  }

  const isPT = ride.is_public_transport;
  const isInbound = ride.direction === "Inbound";
  const isRestaurant = ride.direction === "Restaurant";
  const isTimo = ride.driver.trim().toLowerCase() === "timo";
  const isRecent = status === "recent";

  const route = parseRoute(ride.maps_link);
  const fromLabel = route?.origin ?? (
    isInbound ? ride.start_location :
    isRestaurant ? "Hotel / Con" :
    "Con locatie"
  );
  const toLabel = route?.destination ?? (
    isInbound ? "Con locatie" :
    ride.start_location
  );
  const embedUrl  = route
    ? buildEmbedUrl(route.origin, route.destination)
    : buildEmbedUrl(ride.start_location);
  const openUrl = ride.maps_link
    || `https://www.google.com/maps/search/?api=1&query=${enc(ride.start_location)}`;

  // Left border by urgency
  const borderClass =
    status === "urgent" ? "border-l-4 border-l-rose-400" :
    status === "soon"   ? "border-l-4 border-l-amber-400" :
    status === "recent" ? "border-l-4 border-l-slate-300" :
    "";

  return (
    <>
      <motion.div variants={cardItem} className={isRecent ? "opacity-60" : ""}>
        <div className={`card-surface rounded-2xl overflow-hidden ${borderClass}`}>

          {/* Action required banner */}
          {ride.action_required && status !== "past" && (
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertCircle size={12} />
              Actie vereist — reageer hieronder
            </div>
          )}

          {/* Status banner */}
          {status === "urgent" && (
            <div className="flex items-center gap-2 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600">
              <Timer size={12} />
              Vertrekt over {formatCountdown(minutesUntil)}!
            </div>
          )}
          {status === "soon" && (
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-600">
              <Timer size={12} />
              Vertrekt over {formatCountdown(minutesUntil)}
            </div>
          )}
          {status === "recent" && (
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400">
              <Clock size={12} />
              Vertrokken
            </div>
          )}

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isPT ? "bg-gradient-to-br from-violet-400 to-purple-500" :
                  isRestaurant ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                  "gradient-brand"
                }`}
              >
                {isRestaurant ? (
                  <Utensils size={20} className="text-white" strokeWidth={2} />
                ) : isPT ? (
                  <Train size={20} className="text-white" strokeWidth={2} />
                ) : isTimo ? (
                  <Truck size={20} className="text-white" strokeWidth={2} />
                ) : (
                  <Car size={20} className="text-white" strokeWidth={2} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="font-black text-slate-900 text-sm">{ride.driver}</span>
                  {isPT && <Badge variant="violet">OV</Badge>}
                  {isRestaurant && ride.car_available && <Badge variant="green">Auto beschikbaar</Badge>}
                  {isRestaurant && !ride.car_available && <Badge variant="gray">Eigen vervoer</Badge>}
                  {isRecent && <Badge variant="gray">Vertrokken</Badge>}
                  {!isRecent && ride.is_full && <Badge variant="red" dot>Vol</Badge>}
                  {!isRecent && !isPT && !isRestaurant && !ride.is_full && (
                    <Badge variant="green" dot>
                      {ride.seats_left} meerijder{ride.seats_left !== 1 ? "s" : ""} welkom
                    </Badge>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Clock
                    size={11}
                    className={`shrink-0 ${
                      status === "urgent" ? "text-rose-400" :
                      status === "soon"   ? "text-amber-400" :
                      "text-sky-400"
                    }`}
                  />
                  {formatDateTime(ride.departure_time)}
                </span>
              </div>

              <button
                onClick={() => setExpanded((e) => !e)}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} />
                </motion.div>
              </button>
            </div>

            {/* Route strip */}
            <div className="mt-3 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 leading-none mb-0.5">Van</p>
                <p className="text-sm font-bold text-slate-800 truncate">{fromLabel}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                <div className="h-px w-4 bg-slate-200" />
                <ArrowRight size={13} className="text-sky-400" />
                <div className="h-px w-4 bg-slate-200" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs text-slate-400 leading-none mb-0.5">Naar</p>
                <p className="text-sm font-bold text-slate-800 truncate">{toLabel}</p>
              </div>
            </div>

            {/* Seat dots */}
            {!isPT && !isRecent && (
              <div className="mt-3 flex items-center gap-2 px-1">
                <SeatDots total={ride.total_seats} left={ride.seats_left} />
                <span className="text-xs text-slate-400">
                  {ride.total_seats - ride.seats_left}/{ride.total_seats} meerijders
                </span>
              </div>
            )}

            {/* Expanded section */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    {/* Passengers */}
                    {ride.passengers.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                          <Users size={11} className="mr-1 inline" />
                          Meerijders
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ride.passengers.map((p) => (
                            <Badge key={p} variant="blue">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parking */}
                    {ride.parking_info && (
                      <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <ParkingCircle size={16} className="shrink-0 text-sky-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Parkeerinfo
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed">{ride.parking_info}</p>
                        </div>
                      </div>
                    )}

                    {/* Route map */}
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <MapPin size={11} className="text-sky-500" />
                        {route ? "Route" : "Vertrekpunt"}
                      </p>
                      <div className="relative rounded-xl overflow-hidden border border-slate-100">
                        <iframe
                          title="Kaart"
                          src={embedUrl}
                          className="w-full h-48 border-0 block"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                        <a
                          href={openUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-white transition-colors"
                        >
                          <ExternalLink size={11} />
                          {route ? "Open route" : "Open in Maps"}
                        </a>
                      </div>
                    </div>

                    {/* Actions — not available for recently departed rides */}
                    {!isPT && !isRecent && (
                      <div className="flex gap-2 pt-1">
                        {!ride.is_full && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="flex-1"
                            onClick={() => setClaimOpen(true)}
                          >
                            <Plus size={14} />
                            Meerijden
                          </Button>
                        )}
                        {ride.passengers.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={ride.is_full ? "flex-1" : ""}
                            onClick={() => setLeaveOpen(true)}
                          >
                            Uitstappen
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

      {/* Claim modal */}
      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Meerijden"
        description={`${fromLabel} → ${toLabel}`}
      >
        <form onSubmit={claimForm.handleSubmit(onClaim)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <SearchSelect
              options={userNames}
              value={claimName}
              onChange={(v) => claimForm.setValue("user_name", v)}
              placeholder="Typ om te zoeken…"
            />
            {claimForm.formState.errors.user_name && (
              <p className="mt-1.5 text-xs text-rose-500">
                {claimForm.formState.errors.user_name.message}
              </p>
            )}
          </div>
          <Button type="submit" loading={claimForm.formState.isSubmitting} className="w-full">
            Plek bevestigen
          </Button>
        </form>
      </Modal>

      {/* Leave modal */}
      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Uitstappen"
        description="Verwijder jezelf als meerijder"
      >
        <form onSubmit={leaveForm.handleSubmit(onLeave)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <SearchSelect
              options={ride.passengers}
              value={leaveName}
              onChange={(v) => leaveForm.setValue("user_name", v)}
              placeholder="Typ om te zoeken…"
            />
          </div>
          <Button
            type="submit"
            variant="danger"
            loading={leaveForm.formState.isSubmitting}
            className="w-full"
          >
            Uitstappen bevestigen
          </Button>
        </form>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TransportPage() {
  const [tab, setTab] = useState<Direction>("Inbound");
  const [createOpen, setCreateOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { data: rides, isLoading } = useRides();
  const { data: users } = useUsers();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreateRide();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { direction: "Inbound", vehicle_type: "Car", total_seats: 4 },
  });

  const vehicleType     = watch("vehicle_type");
  const startLocation   = watch("start_location") ?? "";
  const endLocation     = watch("end_location") ?? "";
  const formDirection   = watch("direction");

  // When switching to Public Transport, fill a large default so validation passes
  useEffect(() => {
    if (vehicleType === "Public Transport") {
      setValue("total_seats", 99);
    }
  }, [vehicleType, setValue]);

  const allFiltered = (rides ?? []).filter((r) => r.direction === tab);
  const activeRides = allFiltered.filter((r) => getRideStatus(r.departure_time).status !== "past");
  const pastRides   = allFiltered
    .filter((r) => getRideStatus(r.departure_time).status === "past")
    .sort((a, b) =>
      new Date(b.departure_time.replace(" ", "T")).getTime() -
      new Date(a.departure_time.replace(" ", "T")).getTime()
    );

  function openCreate() {
    reset({ direction: tab, vehicle_type: "Car", total_seats: 4 });
    setCreateOpen(true);
  }

  async function onCreate(values: CreateForm) {
    const mapsLink = values.end_location
      ? `https://www.google.com/maps/dir/?api=1&origin=${enc(values.start_location)}&destination=${enc(values.end_location)}`
      : `https://www.google.com/maps/search/?api=1&query=${enc(values.start_location)}`;

    try {
      await createMutation.mutateAsync({
        direction: values.direction as Direction,
        vehicle_type: values.vehicle_type as VehicleType,
        driver: values.driver,
        departure_time: values.departure_time,
        start_location: values.start_location,
        total_seats: values.total_seats,
        parking_info: values.parking_info ?? "",
        maps_link: mapsLink,
        car_available: values.car_available ?? false,
        action_required: values.action_required ?? false,
      });
      reset();
      setCreateOpen(false);
      toast("success", "Rit toegevoegd aan het schema!");
    } catch {
      toast("error", "Kon de rit niet toevoegen. Probeer opnieuw.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Direction tabs */}
      <div className="flex gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
        {(["Inbound", "Outbound", "Restaurant"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setTab(d)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${
              tab === d
                ? "bg-white text-slate-900 shadow-card dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {d === "Inbound" && <ArrowRight size={13} className={tab === d ? "text-sky-500" : ""} />}
            {d === "Outbound" && <ArrowLeft size={13} className={tab === d ? "text-sky-500" : ""} />}
            {d === "Restaurant" && <Utensils size={13} className={tab === d ? "text-amber-500" : ""} />}
            {d === "Inbound" ? "Heen" : d === "Outbound" ? "Terug" : "Restaurant"}
          </button>
        ))}
      </div>

      {/* Add button */}
      <Button variant="secondary" className="w-full" onClick={openCreate}>
        <Plus size={16} />
        Rit toevoegen
      </Button>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : allFiltered.length === 0 ? (
        <EmptyState
          icon={<Car size={36} />}
          title="Geen ritten gepland"
          description={`Er zijn nog geen ${tab === "Inbound" ? "heenritten" : tab === "Outbound" ? "terugritten" : "restaurantritten"} toegevoegd.`}
        />
      ) : (
        <>
          {activeRides.length === 0 ? (
            <EmptyState
              icon={<Car size={36} />}
              title="Geen actieve ritten"
              description="Alle ritten zijn al vertrokken. Bekijk de geschiedenis hieronder."
            />
          ) : (
            <motion.div
              key={tab}
              className="space-y-3"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {activeRides.map((ride) => (
                <RideCard key={ride.row_number} ride={ride} userNames={userNames} />
              ))}
            </motion.div>
          )}

          {/* History */}
          {pastRides.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-2">
                  <History size={14} />
                  Geschiedenis ({pastRides.length})
                </span>
                <motion.div animate={{ rotate: showHistory ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      className="mt-3 space-y-3"
                      variants={container}
                      initial="hidden"
                      animate="show"
                    >
                      {pastRides.map((ride) => (
                        <RideCard key={ride.row_number} ride={ride} userNames={userNames} />
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Rit toevoegen"
        description="Vul de details van de rit in"
      >
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Richting
              </label>
              <select className="input-field" {...register("direction")}>
                <option value="Inbound">Heen</option>
                <option value="Outbound">Terug</option>
                <option value="Restaurant">Restaurant</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Type
              </label>
              <select className="input-field" {...register("vehicle_type")}>
                <option value="Car">Auto</option>
                <option value="Public Transport">Openbaar Vervoer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              {vehicleType === "Car" ? "Chauffeur" : "Lijn / vervoerder"}
            </label>
            {vehicleType === "Car" ? (
              <SearchSelect
                options={userNames}
                value={watch("driver") ?? ""}
                onChange={(v) => setValue("driver", v)}
                placeholder="Typ om te zoeken…"
              />
            ) : (
              <input
                className="input-field"
                placeholder="Bijv. NS Intercity"
                autoComplete="off"
                {...register("driver")}
              />
            )}
            {errors.driver && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.driver.message}</p>
            )}
          </div>

          <div className={`grid gap-3 ${vehicleType === "Public Transport" ? "grid-cols-1" : "grid-cols-2"}`}>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Vertrektijd
              </label>
              <input type="datetime-local" className="input-field" {...register("departure_time")} />
              {errors.departure_time && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.departure_time.message}</p>
              )}
            </div>
            {vehicleType !== "Public Transport" && (
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Plaatsen
                </label>
                <input type="number" min={1} max={99} className="input-field" {...register("total_seats")} />
              </div>
            )}
          </div>

          {/* Departure + destination with live route preview */}
          <div className="space-y-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Vertrekpunt
              </label>
              <input
                className="input-field"
                placeholder="Bijv. Amsterdam Sloterdijk, Westmaas"
                {...register("start_location")}
              />
              {errors.start_location && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.start_location.message}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Bestemming (optioneel)
              </label>
              <input
                className="input-field"
                placeholder="Bijv. Rotterdam Ahoy"
                {...register("end_location")}
              />
            </div>
            {/* Live route preview */}
            <RoutePreview start={startLocation} end={endLocation} />
          </div>

          {formDirection === "Restaurant" && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-3 dark:border-amber-900/40 dark:bg-amber-900/20">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Restaurant opties
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-amber-500"
                  {...register("car_available")}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto beschikbaar</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-amber-500"
                  {...register("action_required")}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Actie vereist (reageer verplicht)</span>
              </label>
            </div>
          )}

          {vehicleType === "Car" && formDirection !== "Restaurant" && (
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Parkeerinfo (optioneel)
              </label>
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="Bijv. P2 niveau 1, vak A4. Druk op de groene knop bij de slagboom."
                {...register("parking_info")}
              />
            </div>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            Rit opslaan
          </Button>
        </form>
      </Modal>
    </div>
  );
}
