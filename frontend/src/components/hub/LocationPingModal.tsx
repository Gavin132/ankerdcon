import { useEffect, useState } from "react";
import { Check, Crosshair, MapPin } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { NamePicker } from "../common/NamePicker";
import { useCurrentUser, usePingLocation, useActingPermissions } from "../../hooks/useUsers";
import { toast } from "../../store/toast.store";

const ZONES = ["Op locatie", "Hotel", "Onderweg", "Off-site", "Thuis"] as const;

interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userNames: string[];
}

/**
 * Tell the group where you are: tap "Gebruik mijn locatie" for a GPS pin (the
 * browser asks permission once), add a note, and it shows on Crew and profiles
 * for a couple of hours. The browser only gives a location while the app is
 * open, so this is a ping, not live tracking.
 */
export function LocationPingModal({ open, onClose, userNames }: Props) {
  const { data: me } = useCurrentUser();
  const { actable } = useActingPermissions();
  const pingMutation = usePingLocation();

  const [name, setName] = useState("");
  const [zone, setZone] = useState<string>("Op locatie");
  const [text, setText] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Start fresh every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setZone("Op locatie");
    setText("");
    setCoords(null);
    setLocating(false);
    setGeoError("");
    setName(me?.name ?? "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // The current user may finish loading after the sheet opened.
  useEffect(() => {
    if (open && !name && me?.name) setName(me.name);
  }, [open, name, me?.name]);

  // A GPS pin is only ever attached to your own ping.
  const isMe = !!me && name === me.name;

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

  const hasPin = !!coords && isMe;
  const canSubmit = !!name && (hasPin || text.trim().length > 0);

  async function submit() {
    if (!canSubmit) return;
    try {
      await pingMutation.mutateAsync({
        user_name: name,
        zone,
        text: text.trim(),
        ...(hasPin ? { lat: coords!.lat, lng: coords!.lng, accuracy: coords!.accuracy } : {}),
      });
      toast("success", "Locatie gepingd");
      onClose();
    } catch {
      toast("error", "Kon je locatie niet pingen. Probeer opnieuw.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Locatie pingen"
      subtitle="Laat de groep weten waar je bent"
      footer={
        <Button onClick={submit} loading={pingMutation.isPending} disabled={!canSubmit} className="w-full">
          <MapPin size={16} />
          Pingen
        </Button>
      }
    >
      <div className="space-y-5">
        {isMe && (
          <div>
            <p className="section-label mb-2">Jouw positie</p>
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
        )}

        <div>
          <p className="section-label mb-2">Zone</p>
          <div className="flex flex-wrap gap-1.5">
            {ZONES.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZone(z)}
                aria-pressed={zone === z}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  zone === z ? "border-2 border-outline bg-brand text-brand-on" : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ping-text" className="section-label mb-2 block">
            Details {hasPin ? "(optioneel)" : ""}
          </label>
          <input
            id="ping-text"
            className="input-field"
            placeholder="Bijv. Hal B, ingang links"
            maxLength={120}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div>
          <p className="section-label mb-2">Wie pingt?</p>
          <NamePicker
            options={actable(userNames)}
            value={name}
            onChange={(v) => {
              setName(v);
              setCoords(null);
              setGeoError("");
            }}
            color="sky"
          />
        </div>
      </div>
    </TripSheet>
  );
}
