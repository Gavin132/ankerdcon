import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, Users } from "lucide-react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { useCurrentUser } from "../../hooks/useUsers";
import { useCreateRide } from "../../hooks/useRides";
import { toast } from "../../store/toast.store";
import type { CalendarEvent, Direction, VehicleType } from "../../types";

interface QuickRideModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  initialDirection: Direction;
}

/** Rounds up to the next 5 minutes and formats for a datetime-local input. */
function defaultDepartureTime(): string {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QuickRideModal({ open, onClose, event, initialDirection }: QuickRideModalProps) {
  const { data: me } = useCurrentUser();
  const driver = me?.name ?? "";
  const createMutation = useCreateRide();

  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [departureTime, setDepartureTime] = useState(defaultDepartureTime);
  const [seats, setSeats] = useState(5);
  const [vehicleType, setVehicleType] = useState<VehicleType>("Car");
  const [parkingInfo, setParkingInfo] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Reset to sensible defaults each time the popup is reopened.
  useEffect(() => {
    if (open) {
      setDirection(initialDirection);
      setDepartureTime(defaultDepartureTime());
      setSeats(5);
      setVehicleType("Car");
      setParkingInfo("");
      setAdvancedOpen(false);
    }
  }, [open, initialDirection]);

  const toHotel = direction === "Outbound";
  const startLocation = (toHotel ? event.location : event.hotel_location) || "";
  const endLocation = (toHotel ? event.hotel_location : event.location) || "";
  const missingLocation = !startLocation || !endLocation;

  async function onSubmit() {
    if (!driver) return;
    try {
      await createMutation.mutateAsync({
        direction,
        vehicle_type: vehicleType,
        driver,
        departure_time: departureTime,
        start_location: startLocation,
        end_location: endLocation || undefined,
        total_seats: vehicleType === "Public Transport" ? 99 : seats,
        parking_info: parkingInfo || undefined,
        linked_event_id: event.id,
      });
      toast("success", "Rit toegevoegd!");
      onClose();
    } catch {
      toast("error", "Kon de rit niet toevoegen. Probeer opnieuw.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={toHotel ? "Rit naar hotel aanbieden" : "Rit naar congres aanbieden"}
      description="Alleen de vertrektijd en het aantal plekken zijn nodig."
    >
      <div className="space-y-5">
        {/* Direction toggle */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
          {(["Inbound", "Outbound"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                direction === d
                  ? "bg-white text-slate-900 shadow-card dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {d === "Inbound" ? "Naar congres" : "Naar hotel"}
            </button>
          ))}
        </div>

        {/* Route summary */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
          <p className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {startLocation || "Onbekende locatie"}
          </p>
          <ArrowRight size={14} className="shrink-0 text-slate-400" />
          <p className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">
            {endLocation || "Onbekende locatie"}
          </p>
        </div>
        {missingLocation && (
          <p className="-mt-3 text-xs text-amber-500">
            {toHotel && !event.hotel_location
              ? "Geen hotellocatie ingesteld voor dit evenement — vraag een beheerder dit toe te voegen."
              : "Locatie ontbreekt — je kunt de rit nog aanmaken, maar vul de locatie later handmatig aan."}
          </p>
        )}

        {/* Time + seats */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              Vertrektijd
            </label>
            <input
              type="datetime-local"
              className="input-field"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
            />
          </div>
          {vehicleType !== "Public Transport" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                Totaal aantal plekken in je auto
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1">
                <button
                  type="button"
                  onClick={() => setSeats((s) => Math.max(1, s - 1))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  −
                </button>
                <div className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                  <Users size={13} className="text-slate-400" />
                  {seats}
                </div>
                <button
                  type="button"
                  onClick={() => setSeats((s) => Math.min(99, s + 1))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  +
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Incl. jezelf</p>
            </div>
          )}
        </div>

        {/* Advanced options */}
        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-500 transition-colors"
          >
            <motion.span animate={{ rotate: advancedOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
              <ChevronDown size={13} />
            </motion.span>
            Meer opties
          </button>

          <AnimatePresence>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                      Type vervoer
                    </label>
                    <select
                      className="input-field dark:[color-scheme:dark]"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    >
                      <option value="Car">Auto</option>
                      <option value="Public Transport">Openbaar Vervoer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                      Parkeerinfo
                    </label>
                    <input
                      className="input-field"
                      placeholder="Optioneel"
                      value={parkingInfo}
                      onChange={(e) => setParkingInfo(e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button onClick={onSubmit} loading={createMutation.isPending} className="w-full">
          Rit plaatsen
        </Button>
      </div>
    </Modal>
  );
}
