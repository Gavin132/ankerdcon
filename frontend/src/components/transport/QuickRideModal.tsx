import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, Users } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { useCurrentUser } from "../../hooks/useUsers";
import { useCreateRide } from "../../hooks/useRides";
import { useCalendar } from "../../hooks/useCalendar";
import { toast } from "../../store/toast.store";
import { quickDepartureOptions, splitDateTime, toDateKey } from "../../utils/date";
import { buildTrip, tripIdOf } from "../../utils/trips";
import { defaultRideEnds } from "../../utils/rideLocations";
import type { CalendarEvent, Direction, VehicleType } from "../../types";

interface QuickRideModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent;
  initialDirection: Direction;
  /** Pre-selected departure (`datetime-local`); defaults to "now". */
  initialDeparture?: string;
}


export function QuickRideModal({ open, onClose, event, initialDirection, initialDeparture }: QuickRideModalProps) {
  const { data: me } = useCurrentUser();
  const driver = me?.name ?? "";
  const createMutation = useCreateRide();

  const { data: allEvents = [] } = useCalendar();
  const trip = useMemo(() => buildTrip(allEvents, tripIdOf(event)), [allEvents, event]);

  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  // Once someone types in a location, a later change of day or direction leaves it alone.
  const [edited, setEdited] = useState({ start: false, end: false });
  const [departureTime, setDepartureTime] = useState(() => initialDeparture ?? quickDepartureOptions()[0].value);

  /** Best-guess start/end: the venue on the event side and, on the days the member
   * sleeps there, the hotel on the other (see defaultRideEnds). Depends on which day
   * of the trip the departure falls on. */
  const departureDay = splitDateTime(departureTime)[0];
  function defaultsFor(d: Direction): { start: string; end: string } {
    const days = trip?.days ?? [];
    return defaultRideEnds({
      direction: d,
      dayIndex: days.findIndex((x) => toDateKey(x.date) === departureDay),
      dayCount: Math.max(days.length, 1),
      venue: event.location || "",
      hotel: event.hotel_location || "",
      isHotel: !!event.is_hotel,
    });
  }
  const [seats, setSeats] = useState(5);
  const [vehicleType, setVehicleType] = useState<VehicleType>("Car");
  const [parkingInfo, setParkingInfo] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Reset to sensible defaults each time the popup is reopened.
  useEffect(() => {
    if (open) {
      setDirection(initialDirection);
      setEdited({ start: false, end: false });
      setDepartureTime(initialDeparture ?? quickDepartureOptions()[0].value);
      setSeats(5);
      setVehicleType("Car");
      setParkingInfo("");
      setAdvancedOpen(false);
    }
  }, [open, initialDirection, event]);

  function switchDirection(d: Direction) {
    setDirection(d);
    setEdited({ start: false, end: false });
  }

  // Fills the two ends in, and follows along when the direction or the day changes,
  // until the member types in one of them.
  useEffect(() => {
    if (!open) return;
    const defaults = defaultsFor(direction);
    if (!edited.start) setStartLocation(defaults.start);
    if (!edited.end) setEndLocation(defaults.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, direction, departureDay, trip, edited.start, edited.end]);

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

  const footer = (
    <Button onClick={onSubmit} loading={createMutation.isPending} className="w-full">
      Rit plaatsen
    </Button>
  );

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Rit aanbieden"
      subtitle="Alleen de vertrektijd en het aantal plekken zijn nodig."
      footer={footer}
    >
      <div className="space-y-5">
        {/* Direction toggle */}
        <div className="flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]">
          {(["Inbound", "Outbound"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => switchDirection(d)}
              aria-pressed={direction === d}
              className={`flex-1 rounded-[7px] px-3 py-2 text-[13px] font-semibold transition-colors ${
                direction === d
                  ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {d === "Inbound" ? "Heen" : "Terug"}
            </button>
          ))}
        </div>

        {/* Route summary — editable, so a missing location (e.g. a non-hotel
            event's "home" end) can just be typed in right here. */}
        <div className="flex items-center gap-2.5 rounded-xl border-1.5 border-line bg-sunken px-4 py-3">
          <input
            type="text"
            value={startLocation}
            onChange={(e) => { setStartLocation(e.target.value); setEdited((v) => ({ ...v, start: true })); }}
            placeholder="Onbekende locatie"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
          />
          <ArrowRight size={14} className="shrink-0 text-ink-3" />
          <input
            type="text"
            value={endLocation}
            onChange={(e) => { setEndLocation(e.target.value); setEdited((v) => ({ ...v, end: true })); }}
            placeholder="Onbekende locatie"
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
          />
        </div>
        {missingLocation && (
          <p className="-mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
            Vul de ontbrekende locatie hierboven in.
          </p>
        )}

        {/* Vertrektijd — quick presets plus separate date/time fields, so
            "when" is never hidden behind a single fiddly datetime-local
            control (its time portion is easy to miss/mistap on mobile). */}
        <div>
          <label className="section-label mb-1.5 block">
            Vertrektijd
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quickDepartureOptions().map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setDepartureTime(opt.value)}
                aria-pressed={departureTime === opt.value}
                className={`rounded-full border-1.5 px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  departureTime === opt.value
                    ? "border-outline bg-brand text-brand-on"
                    : "border-line bg-surface text-ink-2 hover:border-ink-3"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="input-field"
              value={splitDateTime(departureTime)[0]}
              onChange={(e) => setDepartureTime(`${e.target.value}T${splitDateTime(departureTime)[1] || "09:00"}`)}
            />
            <input
              type="time"
              className="input-field"
              value={splitDateTime(departureTime)[1]}
              onChange={(e) => setDepartureTime(`${splitDateTime(departureTime)[0]}T${e.target.value}`)}
            />
          </div>
        </div>

        {vehicleType !== "Public Transport" && (
          <div>
            <label className="section-label mb-1.5 block">
              Totaal aantal plekken in je auto
            </label>
            <div className="flex items-center gap-2 rounded-xl border-1.5 border-line bg-surface px-1">
              <button
                type="button"
                onClick={() => setSeats((s) => Math.max(1, s - 1))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
              >
                −
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5 font-mono text-sm font-semibold tabular-nums text-ink">
                <Users size={13} className="text-ink-3" />
                {seats}
              </div>
              <button
                type="button"
                onClick={() => setSeats((s) => Math.min(99, s + 1))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
              >
                +
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink-3">Incl. jezelf</p>
          </div>
        )}

        {/* Advanced options */}
        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-3 transition-colors hover:text-ink"
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
                    <label className="section-label mb-1.5 block">
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
                    <label className="section-label mb-1.5 block">
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
      </div>
    </TripSheet>
  );
}
