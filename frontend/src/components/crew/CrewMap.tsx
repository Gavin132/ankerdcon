import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { ExternalLink } from "lucide-react";
import { useThemeStore } from "../../store/theme.store";
import { avatarColor, personInitial } from "../../utils/avatar";
import { parsePing, pingAgo, pingMapUrl } from "../../utils/locationPing";
import type { AnchorRect } from "../common/UserProfilePopup";
import type { User } from "../../types";

interface Pin {
  user: User;
  lat: number;
  lng: number;
  zone: string | null;
  text: string;
  at: Date | null;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** One avatar as a round disc; the photo sits over the initial, so if it fails to load the initial shows. */
function avatarDisc(user: User, offset: number, z: number): string {
  const name = escapeHtml(user.name);
  const custom = user.color?.startsWith("#");
  const initial = `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 15px/1 Poppins,system-ui,sans-serif;color:#fff">${escapeHtml(personInitial(user.name))}</span>`;
  const photo = user.avatar_url
    ? `<img src="${escapeHtml(user.avatar_url)}" alt="${name}" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />`
    : "";
  const bg = custom ? `background:${escapeHtml(user.color)};` : "";
  return `<div class="${custom ? "" : avatarColor(user.name)}" style="${bg}position:absolute;left:${offset}px;top:0;z-index:${z};width:40px;height:40px;border-radius:9999px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);overflow:hidden">${initial}${photo}</div>`;
}

const SHOWN = 3;
const STEP = 22;

/** A pin for one person, or — when several are in the same spot — their avatars overlapped, with "+N" past the third. */
function pinIcon(users: User[]): L.DivIcon {
  const shown = users.slice(0, SHOWN);
  const extra = users.length - shown.length;
  const discs = shown.map((u, i) => avatarDisc(u, i * STEP, SHOWN - i)).join("");
  const badge = extra > 0
    ? `<div style="position:absolute;left:${shown.length * STEP}px;top:0;z-index:0;width:40px;height:40px;border-radius:9999px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);background:#1b2227;color:#fff;display:flex;align-items:center;justify-content:center;font:700 13px/1 Poppins,system-ui,sans-serif">+${extra}</div>`
    : "";
  const width = 40 + (shown.length - 1) * STEP + (extra > 0 ? STEP : 0);
  return L.divIcon({
    className: "crew-pin",
    html: `<div style="position:relative;width:${width}px;height:40px">${discs}${badge}</div>`,
    iconSize: [width, 40],
    iconAnchor: [width / 2, 20],
    popupAnchor: [0, -22],
  });
}

/** Everyone within this many metres of each other becomes one pin. */
const MERGE_METERS = 20;

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

interface Cluster {
  key: string;
  members: Pin[];
  lat: number;
  lng: number;
}

/** Groups pins that are within MERGE_METERS of one another, directly or through a chain of neighbours. */
function clusterPins(pins: Pin[]): Cluster[] {
  const parent = pins.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < pins.length; i++) {
    for (let j = i + 1; j < pins.length; j++) {
      if (distanceMeters(pins[i], pins[j]) <= MERGE_METERS) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, Pin[]>();
  pins.forEach((p, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), p]));
  return [...groups.values()].map((members) => ({
    key: members.map((m) => m.user.name).sort().join("|"),
    members,
    lat: members.reduce((sum, m) => sum + m.lat, 0) / members.length,
    lng: members.reduce((sum, m) => sum + m.lng, 0) / members.length,
  }));
}

/** Leaflet measures its container once; this re-measures whenever it changes size (late CSS, rotation, a sheet resizing). */
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/** Frames every pin: one pin zooms in on it, several fit inside the map. */
function FitToPins({ pins }: { pins: { user?: User; lat: number; lng: number; key: string }[] }) {
  const map = useMap();
  const key = pins.map((p) => `${p.key}:${p.lat},${p.lng}`).join("|");
  const framed = useRef(false);
  useEffect(() => {
    // The first framing is instant (an animated one started before the map had its
    // final size leaves an unfilled strip); later changes glide.
    const animate = framed.current;
    framed.current = true;
    map.invalidateSize();
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 15, { animate });
    } else if (pins.length > 1) {
      map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [48, 48], maxZoom: 16, animate });
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface CrewMapProps {
  /** Users whose ping is still fresh. Only those that shared a GPS position get a pin. */
  users: User[];
  onOpenProfile: (user: User, rect: AnchorRect) => void;
}

/** Everyone who shared their position, as their avatar on one map. Lazy-loaded — Leaflet is only fetched when there's a pin to show. */
export default function CrewMap({ users, onOpenProfile }: CrewMapProps) {
  const isDark = useThemeStore((s) => s.isDark);

  const pins = useMemo<Pin[]>(
    () =>
      users.flatMap((user) => {
        const p = parsePing(user.live_location_ping);
        return p && p.lat !== undefined && p.lng !== undefined
          ? [{ user, lat: p.lat, lng: p.lng, zone: p.zone, text: p.text, at: p.at }]
          : [];
      }),
    [users],
  );

  const clusters = useMemo(() => clusterPins(pins), [pins]);

  if (pins.length === 0) return null;

  return (
    <div className={`isolate h-[280px] w-full overflow-hidden border-t border-line sm:h-[340px] ${isDark ? "crew-map-dark" : ""}`}>
      <MapContainer
        center={[pins[0].lat, pins[0].lng]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full bg-sunken"
        attributionControl
      >
        {/* OpenStreetMap's own tiles need no API key; dark mode inverts them in CSS (see .crew-map-dark). */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <KeepSized />
        <FitToPins pins={clusters} />
        {clusters.map((c) => (
          <Marker key={c.key} position={[c.lat, c.lng]} icon={pinIcon(c.members.map((m) => m.user))}>
            <Popup closeButton={false}>
              <div className="max-h-[170px] min-w-[170px] space-y-2 overflow-y-auto text-[13px] leading-snug">
                {c.members.map((p) => (
                  <div key={p.user.name} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.user.name}</p>
                      <p className="truncate text-neutral-600">{p.text || p.zone || "Locatie gedeeld"}</p>
                      <p className="font-mono text-[11px] text-neutral-500">
                        {[p.text ? p.zone : null, p.at ? pingAgo(p.at) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5 text-[12px] font-semibold">
                      <button
                        type="button"
                        className="text-sky-700 hover:underline"
                        onClick={(e) => {
                          const r = (e.currentTarget.closest(".leaflet-container") as HTMLElement).getBoundingClientRect();
                          onOpenProfile(p.user, { top: r.top, left: r.left, right: r.right, height: r.height });
                        }}
                      >
                        Profiel
                      </button>
                      <a className="inline-flex items-center gap-0.5 text-sky-700 hover:underline" href={pingMapUrl(p.lat, p.lng)} target="_blank" rel="noopener noreferrer">
                        Route <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
