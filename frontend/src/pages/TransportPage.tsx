import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Train,
  MapPin,
  Clock,
  Users,
  ParkingCircle,
  Plus,
  ExternalLink,
  ChevronDown,
  Navigation,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { useRides, useCreateRide, useClaimSeat, useLeaveSeat } from "../hooks/useRides";
import { formatDateTime, formatTime } from "../utils/format";
import type { Direction, VehicleType, Ride } from "../types";
import { DIRECTIONS, VEHICLE_TYPES } from "../constants";

const createSchema = z.object({
  direction: z.enum(["Inbound", "Outbound"]),
  vehicle_type: z.enum(["Car", "Public Transport"]),
  driver: z.string().min(1, "Verplicht"),
  departure_time: z.string().min(1, "Verplicht"),
  start_location: z.string().min(1, "Verplicht"),
  total_seats: z.coerce.number().min(1).max(99),
  parking_info: z.string().optional(),
  maps_link: z.string().optional(),
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
      {total > 8 && (
        <span className="text-xs text-slate-400">+{total - 8}</span>
      )}
    </div>
  );
}

function RideCard({ ride }: { ride: Ride }) {
  const [expanded, setExpanded] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const claimMutation = useClaimSeat();
  const leaveMutation = useLeaveSeat();

  const claimForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const leaveForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = claimForm;

  async function onClaim(values: NameForm) {
    await claimMutation.mutateAsync({ rowNumber: ride.row_number, payload: values });
    reset();
    setClaimOpen(false);
  }

  async function onLeave(values: NameForm) {
    await leaveMutation.mutateAsync({ rowNumber: ride.row_number, payload: values });
    leaveForm.reset();
    setLeaveOpen(false);
  }

  const isPT = ride.is_public_transport;

  return (
    <>
      <motion.div variants={cardItem}>
        <div className="card-surface rounded-2xl overflow-hidden">
          {/* Card header strip */}
          <div
            className={`h-1 w-full ${
              isPT
                ? "bg-gradient-to-r from-violet-400 to-purple-500"
                : ride.is_full
                ? "bg-gradient-to-r from-rose-400 to-rose-500"
                : "bg-gradient-to-r from-sky-400 to-blue-500"
            }`}
          />

          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isPT
                    ? "bg-violet-50 text-violet-600"
                    : "bg-sky-50 text-sky-600"
                }`}
              >
                {isPT ? <Train size={20} strokeWidth={2} /> : <Car size={20} strokeWidth={2} />}
              </div>

              {/* Info */}
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

                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Navigation size={11} className="text-slate-400" />
                    {ride.start_location}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <Clock size={11} className="text-sky-400" />
                    {formatTime(ride.departure_time)}
                  </span>
                </div>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpanded((e) => !e)}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} />
                </motion.div>
              </button>
            </div>

            {/* Seat visualization for cars */}
            {!isPT && (
              <div className="mt-3 flex items-center gap-3">
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
                    {/* Full departure time */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={12} className="text-sky-400" />
                      <span>Vertrek: <span className="font-semibold text-slate-700">{formatDateTime(ride.departure_time)}</span></span>
                    </div>

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

                    {/* Parking info */}
                    {ride.parking_info && (
                      <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                        <ParkingCircle size={16} className="shrink-0 text-sky-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Parkeerinfo</p>
                          <p className="text-sm font-medium text-slate-800">{ride.parking_info}</p>
                        </div>
                        {ride.maps_link && (
                          <a
                            href={ride.maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm"
                          >
                            <MapPin size={16} />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Maps link without parking info */}
                    {ride.maps_link && !ride.parking_info && (
                      <a
                        href={ride.maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700"
                      >
                        <ExternalLink size={14} />
                        Bekijk op Google Maps
                      </a>
                    )}

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

      <Modal open={claimOpen} onClose={() => setClaimOpen(false)} title="Plek claimen" description={`Rit met ${ride.driver} → ${ride.start_location}`}>
        <form onSubmit={handleSubmit(onClaim)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <input className="input-field" placeholder="Naam" {...register("user_name")} />
            {errors.user_name && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.user_name.message}</p>
            )}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Plek bevestigen
          </Button>
        </form>
      </Modal>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Uitstappen" description="Verwijder jezelf als passagier">
        <form onSubmit={leaveForm.handleSubmit(onLeave)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <input className="input-field" placeholder="Naam" {...leaveForm.register("user_name")} />
          </div>
          <Button type="submit" variant="danger" loading={leaveForm.formState.isSubmitting} className="w-full">
            Uitstappen bevestigen
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function TransportPage() {
  const [tab, setTab] = useState<Direction>("Inbound");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: rides, isLoading } = useRides();
  const createMutation = useCreateRide();

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<CreateForm>({
      resolver: zodResolver(createSchema),
      defaultValues: { direction: "Inbound", vehicle_type: "Car", total_seats: 4 },
    });

  const vehicleType = watch("vehicle_type");
  const filtered = (rides ?? []).filter((r) => r.direction === tab);

  async function onCreate(values: CreateForm) {
    await createMutation.mutateAsync({
      ...values,
      direction: values.direction as Direction,
      vehicle_type: values.vehicle_type as VehicleType,
    });
    reset();
    setCreateOpen(false);
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
      <Button variant="secondary" className="w-full" onClick={() => setCreateOpen(true)}>
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
            <RideCard key={ride.row_number} ride={ride} />
          ))}
        </motion.div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Rit toevoegen" description="Vul de details van de rit in">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Richting</label>
              <select className="input-field" {...register("direction")}>
                <option value="Inbound">Heen</option>
                <option value="Outbound">Terug</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Type</label>
              <select className="input-field" {...register("vehicle_type")}>
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              {vehicleType === "Car" ? "Chauffeur" : "Lijn / vervoerder"}
            </label>
            <input className="input-field" placeholder={vehicleType === "Car" ? "Naam" : "Bijv. NS Intercity"} {...register("driver")} />
            {errors.driver && <p className="mt-1.5 text-xs text-rose-500">{errors.driver.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Vertrektijd</label>
              <input type="datetime-local" className="input-field" {...register("departure_time")} />
              {errors.departure_time && <p className="mt-1.5 text-xs text-rose-500">{errors.departure_time.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Plaatsen</label>
              <input type="number" min={1} max={99} className="input-field" {...register("total_seats")} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Vertreklocatie</label>
            <input className="input-field" placeholder="Bijv. Amsterdam Centraal" {...register("start_location")} />
            {errors.start_location && <p className="mt-1.5 text-xs text-rose-500">{errors.start_location.message}</p>}
          </div>

          {vehicleType === "Car" && (
            <>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Parkeerinfo (optioneel)</label>
                <input className="input-field" placeholder="Bijv. P2 niveau 1, vak A4" {...register("parking_info")} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Google Maps link (optioneel)</label>
                <input className="input-field" placeholder="https://maps.google.com/..." {...register("maps_link")} />
              </div>
            </>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            Rit opslaan
          </Button>
        </form>
      </Modal>
    </div>
  );
}
