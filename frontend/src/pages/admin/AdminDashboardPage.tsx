import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Car,
  UtensilsCrossed,
  CalendarDays,
  Shield,
  TrendingUp,
} from "lucide-react";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { routes } from "../../config/routes";
import { useAuthStore } from "../../store/auth.store";
import { useUser } from "../../hooks/useUsers";
import {
  useAdminStats,
  useAdminUsers,
  useAdminMeals,
  useAdminEvents,
} from "../../hooks/useAdmin";

const DAYS_NL = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
const MONTHS_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

const STAT_CARDS = [
  { key: "users"  as const, label: "Gebruikers",    icon: Users,           color: "#38bdf8", path: routes.admin.users  },
  { key: "rides"  as const, label: "Ritten",         icon: Car,             color: "#a78bfa", path: routes.admin.rides  },
  { key: "meals"  as const, label: "Maaltijden",     icon: UtensilsCrossed, color: "#fbbf24", path: routes.admin.meals  },
  { key: "events" as const, label: "Evenementen",    icon: CalendarDays,    color: "#34d399", path: routes.admin.events },
] as const;

// ── Custom dark tooltip ───────────────────────────────────────────────────────

function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0d1117] border border-white/[0.1] px-3 py-2.5 shadow-xl text-xs">
      {label && (
        <p className="text-slate-400 mb-1.5 font-semibold truncate max-w-[200px]">{label}</p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-white font-bold">{p.value}</span>
          {p.name && p.name !== "value" && (
            <span className="text-slate-500">{p.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

const AXIS_STYLE = { fill: "#475569", fontSize: 11, fontFamily: "inherit" };

// ── Chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  loading,
  empty,
  emptyText,
  height = 200,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  loading: boolean;
  empty: boolean;
  emptyText?: string;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={14} className="text-slate-500" />}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {loading ? (
        <div className="animate-pulse rounded-xl bg-white/[0.04]" style={{ height }} />
      ) : empty ? (
        <p className="text-sm text-slate-600 py-8 text-center">
          {emptyText ?? "Geen data"}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: allUsers = [], isLoading: usersLoading } = useAdminUsers();
  const { data: meals = [], isLoading: mealsLoading } = useAdminMeals();
  const { data: events = [], isLoading: eventsLoading } = useAdminEvents();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: me } = useUser(currentUser ?? "");

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const dateLabel = `${DAYS_NL[now.getDay()]} ${now.getDate()} ${MONTHS_NL[now.getMonth()]}`;

  // ── User growth per month ───────────────────────────────────────────────────

  const userGrowthData = useMemo(() => {
    const usersWithDate = allUsers.filter((u) => u.created_at);
    if (!usersWithDate.length) return [];

    const map = new Map<string, number>();
    for (const u of usersWithDate) {
      const month = u.created_at!.slice(0, 7); // "YYYY-MM"
      map.set(month, (map.get(month) ?? 0) + 1);
    }
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let cumulative = 0;
    return sorted.map(([month, newUsers]) => {
      cumulative += newUsers;
      const [year, m] = month.split("-");
      const label = `${MONTHS_NL[parseInt(m) - 1].slice(0, 3)} '${year.slice(2)}`;
      return { month, label, newUsers, cumulative };
    });
  }, [allUsers]);

  // ── Events: sorted by date, attendees per event ────────────────────────────

  const eventsChartData = useMemo(
    () =>
      [...events]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((ev) => ({
          name: ev.event_name.length > 16 ? ev.event_name.slice(0, 14) + "…" : ev.event_name,
          aangemeld: ev.participants?.length ?? 0,
        })),
    [events],
  );

  // ── Meals: sorted by time, attendees per meal ──────────────────────────────

  const mealsChartData = useMemo(
    () =>
      [...meals]
        .sort((a, b) => new Date(a.time.replace(" ", "T")).getTime() - new Date(b.time.replace(" ", "T")).getTime())
        .map((m) => ({
          name: m.meal_name.length > 16 ? m.meal_name.slice(0, 14) + "…" : m.meal_name,
          aangemeld: m.participants?.length ?? 0,
        })),
    [meals],
  );

  return (
    <div className="p-5 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* ── Welcome banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <Shield
          size={80}
          strokeWidth={1}
          className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-white/10 hidden sm:block"
        />
        <div className="relative">
          <p className="text-sky-300 text-sm font-medium mb-1">{greeting},</p>
          <h1 className="text-2xl lg:text-3xl font-black text-white">{me?.name ?? "Admin"}!</h1>
          <p className="text-sky-400/80 text-sm mt-2">{dateLabel} · Admin Portal</p>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, path }) => {
          const value = stats?.[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              className="group flex flex-col gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.07] p-4 text-left hover:bg-white/[0.07] hover:border-white/[0.13] transition-all"
            >
              <div className="flex items-center justify-between">
                <Icon size={14} style={{ color }} />
                <span className="text-[10px] font-semibold text-slate-600 group-hover:text-slate-400 transition-colors uppercase tracking-wide">
                  Bekijk
                </span>
              </div>
              {statsLoading ? (
                <div className="h-8 w-16 rounded-lg bg-white/[0.06] animate-pulse" />
              ) : (
                <span className="text-3xl font-black text-white leading-none">{value}</span>
              )}
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Gebruikersgroei ────────────────────────────────────────────────── */}
      <ChartCard
        title="Gebruikersgroei"
        subtitle="Nieuwe registraties per maand + cumulatief totaal"
        icon={TrendingUp}
        loading={usersLoading}
        empty={userGrowthData.length === 0}
        emptyText="Geen registratiedatum data beschikbaar"
        height={220}
      >
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={userGrowthData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar
              dataKey="newUsers"
              name="Nieuw"
              fill="url(#barGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Line
              dataKey="cumulative"
              name="Totaal"
              type="monotone"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={{ r: 3, fill: "#a78bfa", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#a78bfa" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-end">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-400/70" />
            Nieuw per maand
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-0.5 w-4 rounded bg-violet-400" />
            Cumulatief
          </span>
        </div>
      </ChartCard>

      {/* ── Deelname evenementen + maaltijden ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Deelname evenementen"
          subtitle="Aangemelde deelnemers per event"
          icon={CalendarDays}
          loading={eventsLoading}
          empty={eventsChartData.length === 0}
          emptyText="Geen evenementen"
          height={200}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={eventsChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={AXIS_STYLE}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="aangemeld"
                name="Aangemeld"
                fill="#34d399"
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Deelname maaltijden"
          subtitle="Aangemelde deelnemers per maaltijd"
          icon={UtensilsCrossed}
          loading={mealsLoading}
          empty={mealsChartData.length === 0}
          emptyText="Geen maaltijden"
          height={200}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mealsChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={AXIS_STYLE}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="aangemeld"
                name="Aangemeld"
                fill="#fbbf24"
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
