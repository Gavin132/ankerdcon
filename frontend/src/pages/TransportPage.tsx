import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
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
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { useRides, useCreateRide, useClaimSeat, useLeaveSeat } from "../hooks/useRides";
import { useUsers } from "../hooks/useUsers";
import { formatDateTime } from "../utils/format";
import { toast } from "../store/toast.store";
import type { Direction, VehicleType, Ride } from "../types";
import { DIRECTIONS } from "../constants";

const enc = encodeURIComponent;

const createSchema = z.object({
  direction: z.enum(["Inbound", "Outbound"]),
  vehicle_type: z.enum(["Car", "Public Transport"]),
  driver: z.string().min(1, "Verplicht"),
  departure_time: z.string().min(1, "Verplicht"),
  start_location: z.string().min(1, "Verplicht"),
  end_location: z.string().optional(),
  total_seats: z.coerce.number().min(1).max(99),
  parking_info: z.string().optional(),
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

/**
 * Parse the stored maps_link (google.com/maps/dir/?api=1&origin=X&destination=Y)
 * to get the human-readable addresses back.
 */
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

/** Embed URL that shows turn-by-turn route (works without API key). */
function buildEmbedUrl(start: string, end?: string): string {
  if (end && end.trim()) {
    return `https://maps.google.com/maps?saddr=${enc(start)}&daddr=${enc(end)}&output=embed`;
  }
  return `https://maps.google.com/maps?q=${enc(start)}&output=embed`;
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
  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();
  const claimForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const leaveForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });

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

  // Prefer explicit origin/destination parsed from maps_link (set when ride was
  // created with the new form). Fall back to direction-based inference.
  const route = parseRoute(ride.maps_link);
  const fromLabel = route?.origin ?? (isInbound ? ride.start_location : "Con locatie");
  const toLabel   = route?.destination ?? (isInbound ? "Con locatie" : ride.start_location);

  // Route embed: shows turn-by-turn directions when both points are known.
  const embedUrl = route
    ? buildEmbedUrl(route.origin, route.destination)
    : buildEmbedUrl(ride.start_location);

  const openUrl = ride.maps_link
    || `https://www.google.com/maps/search/?api=1&query=${enc(ride.start_location)}`;

  return (
    <>
      <motion.div variants={cardItem}>
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isPT ? "bg-gradient-to-br from-violet-400 to-purple-500" : "gradient-brand"
                }`}
              >
                {isPT ? (
                  <Train size={20} className="text-white" strokeWidth={2} />
                ) : (
                  <Car size={20} className="text-white" strokeWidth={2} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="font-black text-slate-900 text-sm">{ride.driver}</span>
                  {isPT && <Badge variant="violet">OV</Badge>}
                  {ride.is_full && <Badge variant="red" dot>Vol</Badge>}
                  {!isPT && !ride.is_full && (
                    <Badge variant="green" dot>
                      {ride.seats_left} plek{ride.seats_left !== 1 ? "ken" : ""} vrij
                    </Badge>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Clock size={11} className="text-sky-400 shrink-0" />
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
            {!isPT && (
              <div className="mt-3 flex items-center gap-2 px-1">
                <SeatDots total={ride.total_seats} left={ride.seats_left} />
                <span className="text-xs text-slate-400">
                  {ride.total_seats - ride.seats_left}/{ride.total_seats} bezet
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
                          Passagiers
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

                    {/* Route map — shows full route when both points known, single pin otherwise */}
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

                    {/* Actions */}
                    {!isPT && (
                      <div className="flex gap-2 pt-1">
                        {!ride.is_full && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="flex-1"
                            onClick={() => setClaimOpen(true)}
                          >
                            <Plus size={14} />
                            Plek claimen
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
        title="Plek claimen"
        description={`${fromLabel} → ${toLabel}`}
      >
        <form onSubmit={claimForm.handleSubmit(onClaim)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            {userNames.length > 0 ? (
              <select className="input-field" {...claimForm.register("user_name")}>
                <option value="">Selecteer naam…</option>
                {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input className="input-field" placeholder="Naam" {...claimForm.register("user_name")} />
            )}
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
        description="Verwijder jezelf als passagier"
      >
        <form onSubmit={leaveForm.handleSubmit(onLeave)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            {ride.passengers.length > 0 ? (
              <select className="input-field" {...leaveForm.register("user_name")}>
                <option value="">Selecteer naam…</option>
                {ride.passengers.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input className="input-field" placeholder="Naam" {...leaveForm.register("user_name")} />
            )}
          </div>
          <Button type="submit" variant="danger" loading={leaveForm.formState.isSubmitting} className="w-full">
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
  const { data: rides, isLoading } = useRides();
  const { data: users } = useUsers();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreateRide();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { direction: "Inbound", vehicle_type: "Car", total_seats: 4 },
  });

  const vehicleType   = watch("vehicle_type");
  const startLocation = watch("start_location") ?? "";
  const endLocation   = watch("end_location") ?? "";
  const filtered = (rides ?? []).filter((r) => r.direction === tab);

  function openCreate() {
    reset({ direction: tab, vehicle_type: "Car", total_seats: 4 });
    setCreateOpen(true);
  }

  async function onCreate(values: CreateForm) {
    // Encode departure + destination into a Google Maps directions URL.
    // This is parsed back on the card to show the real route embed.
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
      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
        {DIRECTIONS.map((d) => (
          <button
            key={d}
            onClick={() => setTab(d)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
              tab === d
                ? "bg-white text-slate-900 shadow-card"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {d === "Inbound" ? (
              <ArrowRight size={14} className={tab === d ? "text-sky-500" : ""} />
            ) : (
              <ArrowLeft size={14} className={tab === d ? "text-sky-500" : ""} />
            )}
            {d === "Inbound" ? "Heen" : "Terug"}
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Car size={36} />}
          title="Geen ritten gepland"
          description={`Er zijn nog geen ${tab === "Inbound" ? "heenritten" : "terugritten"} toegevoegd.`}
        />
      ) : (
        <motion.div
          key={tab}
          className="space-y-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {filtered.map((ride) => (
            <RideCard key={ride.row_number} ride={ride} userNames={userNames} />
          ))}
        </motion.div>
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
            {vehicleType === "Car" && userNames.length > 0 ? (
              <select className="input-field" {...register("driver")}>
                <option value="">Selecteer chauffeur…</option>
                {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input
                className="input-field"
                placeholder={vehicleType === "Car" ? "Naam" : "Bijv. NS Intercity"}
                {...register("driver")}
              />
            )}
            {errors.driver && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.driver.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Vertrektijd
              </label>
              <input type="datetime-local" className="input-field" {...register("departure_time")} />
              {errors.departure_time && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.departure_time.message}</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Plaatsen
              </label>
              <input type="number" min={1} max={99} className="input-field" {...register("total_seats")} />
            </div>
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
            {/* Live route preview — updates 900 ms after typing stops */}
            <RoutePreview start={startLocation} end={endLocation} />
          </div>

          {vehicleType === "Car" && (
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
