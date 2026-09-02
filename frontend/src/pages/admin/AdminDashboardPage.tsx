import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Car, UtensilsCrossed, CalendarDays, Shield,
  Sparkles, Wallet, MapPin, UserPlus, ChevronRight, TrendingUp,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { routes } from "../../config/routes";
import { useAuthStore } from "../../store/auth.store";
import { useUser } from "../../hooks/useUsers";
import { useCosplays } from "../../hooks/useCosplays";
import { useExpenses } from "../../hooks/useExpenses";
import {
  useAdminStats, useAdminUsers, useAdminEvents,
  useAdminBulkRsvpEvent,
} from "../../hooks/useAdmin";
import { NamePicker } from "../../components/common/NamePicker";
import { toast } from "../../store/toast.store";
import { formatDate, formatAmount } from "../../utils/format";
import { parseEventDate, todayKey, toDateKey } from "../../utils/date";
import type { CalendarEvent, User } from "../../types";

const DAYS_NL = ["Zo","Ma","Di","Wo","Do","Vr","Za"];
const MONTHS_NL = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

// ── Tooltip ───────────────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0d1117] border border-white/[0.1] px-3 py-2.5 shadow-xl text-xs">
      {label && <p className="text-slate-400 mb-1.5 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-white font-bold">{p.value}</span>
          {p.name && p.name !== "value" && <span className="text-slate-500">{p.name}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Bulk RSVP panel ───────────────────────────────────────────────────────────

function BulkRsvpPanel({ event, users, onDone }: {
  event: CalendarEvent; users: User[]; onDone: () => void;
}) {
  const bulkRsvp = useAdminBulkRsvpEvent();
  const [selected, setSelected] = useState<string[]>([]);

  const options = users
    .filter((u) => u.is_active !== false && !event.participants.includes(u.name))
    .map((u) => u.name);

  async function submit() {
    if (!selected.length) return;
    try {
      await bulkRsvp.mutateAsync({ eventId: event.id, userNames: selected });
      toast("success", `${selected.length} ${selected.length === 1 ? "persoon" : "personen"} aangemeld.`);
      setSelected([]);
      onDone();
    } catch {
      toast("error", "Aanmelden mislukt.");
    }
  }

  if (!options.length) {
    return <p className="text-xs text-slate-500 py-2">Iedereen is al aangemeld.</p>;
  }

  return (
    <div className="mt-3 space-y-2.5">
      <NamePicker
        multiple
        options={options}
        value={selected}
        onChange={setSelected}
        placeholder="Zoek leden om aan te melden…"
        color="sky"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!selected.length || bulkRsvp.isPending}
          className="flex-1 rounded-xl bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {bulkRsvp.isPending ? "Aanmelden…" : `${selected.length || 0} aanmelden`}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.05] transition-colors"
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event, users, cosplayCount }: {
  event: CalendarEvent; users: User[]; cosplayCount: number;
}) {
  const navigate = useNavigate();
  const [showRsvp, setShowRsvp] = useState(false);
  const totalActive = users.filter((u) => u.is_active !== false).length;

  return (
    <div className="border-b border-white/[0.05] last:border-0">
      <div className="flex items-center gap-3 py-3 px-1">
        {/* Cover thumbnail */}
        {event.image_url ? (
          <img src={event.image_url} alt="" className="h-9 w-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="h-9 w-14 rounded-lg bg-white/[0.05] shrink-0 flex items-center justify-center">
            <CalendarDays size={14} className="text-slate-600" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{event.event_name}</p>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
            <span>{formatDate(event.date)}</span>
            {event.location && (
              <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                <MapPin size={9} /> {event.location}
              </span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-3 shrink-0 text-xs">
          <span className="text-slate-400">
            <span className="font-bold text-white">{event.participants.length}</span>
            <span className="text-slate-600">/{totalActive}</span>
          </span>
          {cosplayCount > 0 && (
            <span className="flex items-center gap-1 text-violet-400">
              <Sparkles size={10} />
              <span className="font-bold">{cosplayCount}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowRsvp((v) => !v)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              showRsvp
                ? "bg-sky-500/20 text-sky-400"
                : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <UserPlus size={11} />
            RSVP
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.event.view(event.id))}
            className="text-slate-600 hover:text-slate-300 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {showRsvp && (
        <div className="px-1 pb-3">
          <BulkRsvpPanel event={event} users={users} onDone={() => setShowRsvp(false)} />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: allUsers = [], isLoading: usersLoading } = useAdminUsers();
  const { data: events = [], isLoading: eventsLoading } = useAdminEvents();
  const { data: cosplays = [] } = useCosplays();
  const { data: expenses = [] } = useExpenses();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: me } = useUser(currentUser ?? "");

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const dateLabel = `${DAYS_NL[now.getDay()]} ${now.getDate()} ${MONTHS_NL[now.getMonth()]}`;
  const todayStr = todayKey();

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
        .filter(({ date }) => date !== null && toDateKey(date) >= todayStr)
        .sort((a, b) => a.date!.getTime() - b.date!.getTime())
        .map(({ ev }) => ev),
    [events, todayStr],
  );

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const userGrowthData = useMemo(() => {
    const withDate = allUsers.filter((u) => u.created_at);
    if (!withDate.length) return [];
    const map = new Map<string, number>();
    for (const u of withDate) {
      const month = u.created_at!.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + 1);
    }
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let cum = 0;
    return sorted.map(([month, n]) => {
      cum += n;
      const [y, m] = month.split("-");
      return { label: `${MONTHS_NL[parseInt(m) - 1].slice(0, 3)} '${y.slice(2)}`, newUsers: n, cumulative: cum };
    });
  }, [allUsers]);

  const AXIS = { fill: "#475569", fontSize: 11, fontFamily: "inherit" };

  const METRICS = [
    { label: "Gebruikers",  value: stats?.users,  icon: Users,           color: "#38bdf8", path: routes.admin.users  },
    { label: "Evenementen", value: stats?.events,  icon: CalendarDays,    color: "#34d399", path: routes.admin.events },
    { label: "Ritten",      value: stats?.rides,   icon: Car,             color: "#a78bfa", path: routes.admin.rides  },
    { label: "Maaltijden",  value: stats?.meals,   icon: UtensilsCrossed, color: "#fbbf24", path: routes.admin.meals  },
    { label: "Cosplays",    value: cosplays.length, icon: Sparkles,       color: "#c084fc", path: null                },
    { label: "Uitgaven",    value: formatAmount(totalExpenses), icon: Wallet, color: "#4ade80", path: null           },
  ];

  return (
    <div className="p-5 lg:p-8 space-y-6 max-w-6xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{greeting},</p>
          <h1 className="text-xl font-black text-white mt-0.5">{me?.name ?? "Admin"}</h1>
          <p className="text-xs text-slate-600 mt-0.5">{dateLabel} · Admin Portal</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-sky-600/20 border border-sky-500/20 flex items-center justify-center">
          <Shield size={16} className="text-sky-400" />
        </div>
      </div>

      {/* ── Metrics strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {METRICS.map(({ label, value, icon: Icon, color, path }) => (
          <button
            key={label}
            type="button"
            onClick={() => path && navigate(path)}
            disabled={!path}
            className={`flex flex-col gap-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-left ${path ? "hover:bg-white/[0.06] transition-colors" : "cursor-default"}`}
          >
            <Icon size={12} style={{ color }} />
            {statsLoading && typeof value === "number" ? (
              <div className="h-5 w-8 rounded bg-white/[0.06] animate-pulse" />
            ) : (
              <span className="text-lg font-black text-white leading-none tabular-nums">{value ?? 0}</span>
            )}
            <span className="text-[10px] text-slate-500 font-medium leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Upcoming events ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <CalendarDays size={10} /> Aankomende evenementen
          </p>
          <button
            type="button"
            onClick={() => navigate(routes.admin.events)}
            className="text-[10px] text-slate-500 hover:text-sky-400 transition-colors"
          >
            Alle evenementen →
          </button>
        </div>

        <div className="px-4">
          {eventsLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-600 py-6 text-center">Geen aankomende evenementen</p>
          ) : (
            upcomingEvents.map((ev) => (
              <EventRow
                key={ev.id}
                event={ev}
                users={allUsers}
                cosplayCount={cosplays.filter((c) => c.linked_event_ids.includes(ev.id)).length}
              />
            ))
          )}
        </div>
      </div>

      {/* ── User growth chart ────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={13} className="text-slate-500" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Gebruikersgroei</p>
        </div>
        {usersLoading ? (
          <div className="h-40 rounded-xl bg-white/[0.04] animate-pulse" />
        ) : userGrowthData.length === 0 ? (
          <p className="text-sm text-slate-600 py-6 text-center">Geen data beschikbaar</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={userGrowthData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="newUsers" name="Nieuw" fill="url(#barG)" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Line dataKey="cumulative" name="Totaal" type="monotone" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 justify-end">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <span className="h-2 w-2 rounded-sm bg-sky-400/60" /> Nieuw
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <span className="h-px w-4 bg-violet-400" /> Cumulatief
              </span>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
