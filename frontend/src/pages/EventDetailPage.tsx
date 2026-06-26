import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Globe,
  Ticket,
  Clock,
  ParkingCircle,
  AlertCircle,
  Package,
  Lock,
  BedDouble,
  Users,
  Wind,
  Droplets,
  Sun,
  Sunrise,
} from "lucide-react";
import { useCalendar } from "../hooks/useCalendar";
import { useUsers } from "../hooks/useUsers";
import { useEventWeather } from "../hooks/useEventWeather";
import { UserAvatar } from "../components/common/UserAvatar";
import { formatCurrency } from "../utils/format";
import { parseEventDate } from "../utils/date";
import type { EventWeather } from "../hooks/useEventWeather";

const DAYS_NL = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
const MONTHS_NL = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

function formatEventDate(s: string): string {
  const d = parseEventDate(s);
  if (!d) return s;
  return `${DAYS_NL[d.getDay()]} ${d.getDate()} ${MONTHS_NL[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTicketSaleStart(raw: string): string {
  const d = new Date(raw);
  if (!isNaN(d.getTime()))
    return `${DAYS_NL[d.getDay()]} ${d.getDate()} ${MONTHS_NL[d.getMonth()]} om ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  return raw;
}

// ── Weather card ───────────────────────────────────────────────────────────────

function WeatherCard({ weather }: { weather: EventWeather }) {
  const uvLabel =
    weather.uv_index <= 2 ? "Laag"
    : weather.uv_index <= 5 ? "Matig"
    : weather.uv_index <= 7 ? "Hoog"
    : "Zeer hoog";
  const uvColor =
    weather.uv_index <= 2 ? "text-emerald-500"
    : weather.uv_index <= 5 ? "text-yellow-500"
    : weather.uv_index <= 7 ? "text-orange-500"
    : "text-rose-500";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header — sky gradient banner like profile */}
      <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-100/60 mb-3">
          Weersvoorspelling
        </p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white leading-none tabular-nums">
                {weather.temp_max}°
              </span>
              <span className="text-xl font-light text-sky-200">/{weather.temp_min}°C</span>
            </div>
            <p className="text-base font-semibold text-white mt-1.5">{weather.description}</p>
            <p className="text-sm text-sky-200/70 mt-0.5">
              Voelt als {weather.feels_max}° – {weather.feels_min}°C
            </p>
          </div>
          <span className="text-6xl leading-none shrink-0">{weather.icon}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
        {[
          { icon: Droplets,  label: "Neerslag", value: `${weather.precip_prob_max}%`, sub: `${weather.precipitation_mm} mm`, cls: "text-sky-500" },
          { icon: Wind,      label: "Wind",     value: `${weather.wind_max_kmh}`,     sub: "km/h",   cls: "text-slate-400 dark:text-slate-500" },
          { icon: Sun,       label: "UV-index", value: `UV ${weather.uv_index}`,      sub: uvLabel,  cls: uvColor },
          { icon: Sunrise,   label: "Zon",      value: weather.sunrise,               sub: `↓ ${weather.sunset}`, cls: "text-amber-500" },
        ].map(({ icon: Icon, label, value, sub, cls }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 py-3 px-2">
            <Icon size={14} className={`${cls} mb-1`} />
            <p className="text-xs font-bold text-slate-800 dark:text-white leading-none tabular-nums">{value}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{sub}</p>
          </div>
        ))}
      </div>

      {/* Hourly timeline */}
      {weather.hourly.length > 0 && (
        <div className="px-4 py-3">
          <div className="grid grid-cols-6 gap-1">
            {weather.hourly.map((slot) => (
              <div key={slot.hour} className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">{slot.hour}u</p>
                <span className="text-xl leading-none">{slot.icon}</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{slot.temp}°</p>
                {slot.precip_prob > 0 && (
                  <p className="text-[9px] font-semibold text-sky-500 tabular-nums">{slot.precip_prob}%</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: events = [] } = useCalendar();
  const { data: users = [] } = useUsers();

  const event = events.find((e) => e.id === id);

  const weatherDate = (() => {
    if (!event?.date) return undefined;
    const d = parseEventDate(event.date);
    return d ? d.toISOString().split("T")[0] : undefined;
  })();

  const { data: weather, isLoading: weatherLoading } = useEventWeather(
    event?.location,
    weatherDate,
  );

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-slate-400">
        <CalendarDays size={40} className="opacity-30" />
        <p className="text-sm">Evenement niet gevonden</p>
        <button onClick={() => navigate(-1)} className="text-xs text-sky-500 underline">Terug</button>
      </div>
    );
  }

  function resolveUser(stored: string) {
    return users.find((u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored));
  }

  const hasLinks    = event.website || event.ticket_url || event.ticket_sale_start;
  const hasTickets  = (event.ticket_types?.length ?? 0) > 0;
  const showWeather = !!(event.location && weatherDate);

  const practicalRows = [
    event.parking_info         && { icon: ParkingCircle, label: "Parkeren",     content: event.parking_info,         accent: false },
    event.what_to_bring        && { icon: Package,       label: "Wat meenemen", content: event.what_to_bring,        accent: false },
    event.locker_info          && { icon: Lock,          label: "Lockers",      content: event.locker_info,          accent: false },
    event.special_instructions && { icon: AlertCircle,  label: "Let op",       content: event.special_instructions, accent: true  },
  ].filter(Boolean) as { icon: React.ElementType; label: string; content: string; accent: boolean }[];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Sticky topbar — matches app chrome ────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.06]">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
          {event.event_name}
        </span>
      </div>

      {/* ── Hero — uses app gradient-hero, full bleed ─────────────────────── */}
      <div className="relative overflow-hidden gradient-hero">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-12 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-0 h-48 w-64 rounded-full bg-white/5 blur-2xl" />

        <div className="relative max-w-2xl mx-auto px-4 pt-9 pb-11">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {event.event_group_id && (
              <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-semibold text-sky-200">
                {event.event_group_id}
              </span>
            )}
            {event.is_hotel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 border border-violet-400/25 px-3 py-1 text-[11px] font-semibold text-violet-200">
                <BedDouble size={10} /> Hotel
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-[1.05] tracking-tight mb-5">
            {event.event_name}
          </h1>

          {/* Date + Location */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span className="flex items-center gap-2 text-sm text-sky-200/80">
              <CalendarDays size={14} className="text-sky-400 shrink-0" />
              <span className="font-medium capitalize">{formatEventDate(event.date)}</span>
            </span>
            {event.location && (
              <span className="flex items-center gap-2 text-sm text-sky-200/80">
                <MapPin size={14} className="text-sky-400 shrink-0" />
                <span className="font-medium">{event.location}</span>
              </span>
            )}
          </div>

          {event.description && (
            <p className="mt-4 text-sm text-sky-100/60 leading-relaxed max-w-lg">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Weather ─────────────────────────────────────────────────────── */}
        {showWeather && (
          weatherLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-pulse">
              <div className="bg-gradient-to-br from-sky-500/40 to-blue-600/40 h-32" />
              <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
                {[...Array(4)].map((_,i) => <div key={i} className="h-14 bg-slate-50 dark:bg-slate-800/40" />)}
              </div>
              <div className="px-4 py-3 grid grid-cols-6 gap-2">
                {[...Array(6)].map((_,i) => <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800" />)}
              </div>
            </div>
          ) : weather ? (
            <WeatherCard weather={weather} />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-5 flex items-center gap-3 text-slate-400 dark:text-slate-500">
              <span className="text-2xl">🌐</span>
              <p className="text-sm">Geen weersdata beschikbaar voor deze datum of locatie.</p>
            </div>
          )
        )}

        {/* ── Links & Tickets ──────────────────────────────────────────────── */}
        {(hasLinks || hasTickets) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {event.website && (
              <a
                href={event.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group border-b border-slate-100 dark:border-slate-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand shrink-0">
                  <Globe size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Officiële website</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {event.website.replace(/^https?:\/\//, "").split("/")[0]}
                  </p>
                </div>
                <ArrowLeft size={13} className="text-slate-300 dark:text-slate-600 rotate-180 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </a>
            )}

            {event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group border-b border-slate-100 dark:border-slate-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shrink-0">
                  <Ticket size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Tickets kopen</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {event.ticket_url.replace(/^https?:\/\//, "").split("/")[0]}
                  </p>
                </div>
                <ArrowLeft size={13} className="text-slate-300 dark:text-slate-600 rotate-180 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </a>
            )}

            {event.ticket_sale_start && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                  <Clock size={14} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Verkoop start</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {formatTicketSaleStart(event.ticket_sale_start)}
                  </p>
                </div>
              </div>
            )}

            {hasTickets && (
              <>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Ticket prijzen
                  </p>
                </div>
                {event.ticket_types!.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 first:border-0"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.title}</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(t.price)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Practical info — one card, rows with dividers ─────────────────── */}
        {practicalRows.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {practicalRows.map((row, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 px-4 py-4 ${i > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${row.accent ? "bg-amber-100 dark:bg-amber-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                  <row.icon size={14} className={row.accent ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                    {row.label}
                  </p>
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${row.accent ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-300"}`}>
                    {row.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Attendees ─────────────────────────────────────────────────────── */}
        {event.participants.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/10">
                  <Users size={13} className="text-sky-600 dark:text-sky-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Aanmeldingen
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1 tabular-nums">
                {event.participants.length}
              </span>
            </div>

            {/* Facepile */}
            <div className="flex -space-x-2.5 mb-4">
              {event.participants.slice(0, 10).map((p) => {
                const u = resolveUser(p);
                return (
                  <UserAvatar key={p} name={u?.name ?? p} user={u}
                    className="h-9 w-9 text-xs ring-2 ring-white dark:ring-slate-900" />
                );
              })}
              {event.participants.length > 10 && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                  +{event.participants.length - 10}
                </div>
              )}
            </div>

            {/* Name chips */}
            <div className="flex flex-wrap gap-1.5">
              {event.participants.map((p) => {
                const u = resolveUser(p);
                const name = u?.name ?? p;
                return (
                  <div key={p} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    <UserAvatar name={name} user={u} className="h-4 w-4 text-[7px] !border-0" />
                    {name}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
