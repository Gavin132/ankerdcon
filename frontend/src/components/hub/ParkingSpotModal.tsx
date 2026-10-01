import { useEffect, useState } from "react";
import { Check, Crosshair, MapPinned } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { useSetParkingSpot } from "../../hooks/useParking";
import { toast } from "../../store/toast.store";

interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  /** Every driver whose spot the current user may set: themselves, or
   * anyone they share one of this trip's rides with, either direction —
   * mirrors the backend's own check in app/routers/parking.py. */
  manageableDrivers: string[];
}

/**
 * Marks where a driver's car is parked — not where *you* are (that's
 * LocationPingModal), which is why it asks whose car instead of who's
 * pinging. Anyone who shares a ride with that driver can set or correct it;
 * it deliberately doesn't matter who actually taps the pin down.
 */
export function ParkingSpotModal({ open, onClose, tripId, manageableDrivers }: Props) {
  const setMutation = useSetParkingSpot(tripId);
  const [driver, setDriver] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDriver(manageableDrivers[0] ?? "");
    setCoords(null);
    setLocating(false);
    setGeoError("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeoError("Deze browser kan je locatie niet bepalen.");
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Geen toegang tot je locatie. Sta locatie toe voor deze site in je browserinstellingen."
            : err.code === err.TIMEOUT
              ? "Je locatie bepalen duurde te lang. Probeer het opnieuw."
              : "Kon je locatie niet bepalen.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  const canSubmit = !!driver && !!coords;

  async function submit() {
    if (!canSubmit) return;
    try {
      await setMutation.mutateAsync({ driver, lat: coords!.lat, lng: coords!.lng });
      toast("success", "Parkeerplek opgeslagen!");
      onClose();
    } catch {
      toast("error", "Kon parkeerplek niet opslaan. Probeer opnieuw.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Parkeerplek"
      subtitle="Laat zien waar de auto staat"
      footer={
        <Button onClick={submit} loading={setMutation.isPending} disabled={!canSubmit} className="w-full">
          <MapPinned size={16} />
          Opslaan
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="section-label mb-2">Positie</p>
          {coords ? (
            <div className="flex items-center gap-3 rounded-xl border-1.5 border-emerald-200 bg-emerald-50 px-3.5 py-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
              <Check size={16} className="shrink-0 text-emerald-700 dark:text-emerald-300" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">Locatie gevonden</p>
                <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">±{Math.round(coords.accuracy)} m</p>
              </div>
              <button type="button" onClick={locate} className="shrink-0 text-xs font-semibold text-brand-text hover:underline">
                Opnieuw
              </button>
            </div>
          ) : (
            <Button type="button" onClick={locate} loading={locating} className="w-full">
              <Crosshair size={16} />
              Gebruik mijn locatie
            </Button>
          )}
          {geoError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{geoError}</p>}
        </div>

        <div>
          <p className="section-label mb-2">Wiens auto?</p>
          {manageableDrivers.length === 0 ? (
            <p className="text-sm text-ink-3">
              Je rijdt met niemand mee op deze trip, dus er is geen auto om een plek voor in te stellen.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {manageableDrivers.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDriver(d)}
                  aria-pressed={driver === d}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    driver === d ? "border-2 border-outline bg-brand text-brand-on" : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-ink-3">
            Alleen chauffeurs van wie je meerijdt (of jezelf, als je zelf rijdt).
          </p>
        </div>
      </div>
    </TripSheet>
  );
}
