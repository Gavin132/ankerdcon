import { useState } from "react";
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
  MapPin,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { SeatDots } from "./SeatDots";
import { useClaimSeat, useLeaveSeat } from "../../hooks/useRides";
import { formatDateTime } from "../../utils/format";
import { parseRoute, buildEmbedUrl, buildMapsOpenUrl } from "../../utils/maps";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import type { Ride } from "../../types";

const nameSchema = z.object({
  user_name: z.string().min(1, "Vul je naam in"),
});
type NameForm = z.infer<typeof nameSchema>;

interface RideCardProps {
  ride: Ride;
  userNames: string[];
}

export function RideCard({ ride, userNames }: RideCardProps) {
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
  const route = parseRoute(ride.maps_link);
  const fromLabel = route?.origin ?? (isInbound ? ride.start_location : "Con locatie");
  const toLabel = route?.destination ?? (isInbound ? "Con locatie" : ride.start_location);
  const embedUrl = route
    ? buildEmbedUrl(route.origin, route.destination)
    : buildEmbedUrl(ride.start_location);
  const openUrl = buildMapsOpenUrl(ride.maps_link, ride.start_location);

  return (
    <>
      <motion.div variants={listItem}>
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="p-4">
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

            {!isPT && (
              <div className="mt-3 flex items-center gap-2 px-1">
                <SeatDots total={ride.total_seats} left={ride.seats_left} />
                <span className="text-xs text-slate-400">
                  {ride.total_seats - ride.seats_left}/{ride.total_seats} bezet
                </span>
              </div>
            )}

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
