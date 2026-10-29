import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Car, UtensilsCrossed, CalendarDays,
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
import { useCalendar } from "../../hooks/useCalendar";
import {
  useAdminStats, useAdminUsers,
  useAdminBulkRsvpEvent,
} from "../../hooks/useAdmin";
import { NamePicker } from "../../components/common/NamePicker";
import { toast } from "../../store/toast.store";
import { formatDate, formatAmount } from "../../utils/format";
import { parseEventDate, todayKey, toDateKey } from "../../utils/date";
import { getNow } from "../../store/time.store";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { groupCalendarEntries, getGroupTitle, formatDateRange, type CalendarItem } from "../../utils/multiDay";
import type { CalendarEvent, User } from "../../types";
import { EmptyState } from "../../components/common/EmptyState";

const DAYS_NL = ["zo","ma","di","wo","do","vr","za"];
const MONTHS_NL = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

// ── Tooltip ───────────────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border-1.5 border-line bg-surface px-3 py-2.5 text-xs shadow-xl">
      {label && <p className="label-quiet mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="font-mono font-semibold tabular-nums text-ink">{p.value}</span>
          {p.name && p.name !== "value" && <span className="text-ink-3">{p.name}</span>}
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
      await bulkRsvp.mutateAsync({ dayId: event.id, userNames: selected });
      toast("success", `${selected.length} ${selected.length === 1 ? "persoon" : "personen"} aangemeld.`);
      setSelected([]);
      onDone();
    } catch {
      toast("error", "Aanmelden mislukt.");
    }
  }

  if (!options.length) {
    return <p className="py-2 text-xs text-ink-3">Iedereen is al aangemeld.</p>;
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
          className="btn-primary min-h-[44px] flex-1 py-2 text-sm"
        >
          {bulkRsvp.isPending ? "Aanmelden…" : `${selected.length || 0} aanmelden`}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="btn-secondary px-4 py-2.5 text-sm"
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ item, users, cosplayCount }: {
  item: CalendarItem; users: User[]; cosplayCount: number;
}) {
  const navigate = useNavigate();
  const [showRsvp, setShowRsvp] = useState(false);
  const totalActive = users.filter((u) => u.is_active !== false).length;

  const days = item.type === "single" ? [item] : item.events;
  // The nearest actionable day of the trip — drives the quick RSVP panel
  // and the row's navigate target.
  const firstDay = days[0].ev;
  const title = item.type === "single" ? item.ev.event_name : getGroupTitle(item.events);
  const dateLabel = item.type === "single" ? formatDate(item.ev.date) : formatDateRange(item.events.map((d) => d.date));
  const participants = [...new Set(days.flatMap((d) => d.ev.participants))];
  const image = days.find((d) => d.ev.image_url)?.ev.image_url;

  return (
    <div className="border-b border-line last:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        {/* Cover thumbnail */}
        {image ? (
          <img src={image} alt="" className="h-9 w-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-sunken">
            <CalendarDays size={14} className="text-ink-3" />
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-3">
            <span className="whitespace-nowrap font-mono">{dateLabel}</span>
            {firstDay.location && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin size={12} className="shrink-0" /> <span className="truncate">{firstDay.location}</span>
              </span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="ml-auto flex shrink-0 items-center gap-3 text-xs">
          <span className="font-mono tabular-nums text-ink-3">
            <span className="font-semibold text-ink">{participants.length}</span>
            <span>/{totalActive}</span>
          </span>
          {cosplayCount > 0 && (
            <span className="flex items-center gap-1 text-ink-2">
              <Sparkles size={14} />
              <span className="font-mono font-semibold tabular-nums">{cosplayCount}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowRsvp((v) => !v)}
            aria-expanded={showRsvp}
            className="btn-primary hit-area min-h-9 px-3 text-xs"
          >
            <UserPlus size={14} />
            Aanmelden
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.event.view(firstDay.id))}
            aria-label={`${title} openen`}
            className="icon-btn text-ink-3"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {showRsvp && (
        <div className="px-4 pb-3">
          {days.length > 1 && (
            <p className="mb-1.5 text-xs text-ink-3">
              Aanmelden voor {formatDate(firstDay.date)}, de eerstvolgende dag van dit evenement
            </p>
          )}
          <BulkRsvpPanel event={firstDay} users={users} onDone={() => setShowRsvp(false)} />
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
  const { data: events = [], isLoading: eventsLoading } = useCalendar();
  const { data: cosplays = [] } = useCosplays();
  const { data: expenses = [] } = useExpenses();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: me } = useUser(currentUser ?? "");

  const now = getNow();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const dateLabel = `${DAYS_NL[now.getDay()]} ${now.getDate()} ${MONTHS_NL[now.getMonth()]}`;
  const todayStr = todayKey();

  const upcomingItems = useMemo(() => {
    const entries = [...events]
      .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
      .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null && toDateKey(x.date) >= todayStr)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return groupCalendarEntries(entries);
  }, [events, todayStr]);

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

  // Theme colours, so the chart follows light and dark mode and the accent colour.
  const AXIS = { fill: "rgb(var(--ink-3))", fontSize: 12, fontFamily: "Poppins, system-ui, sans-serif" };

  const METRICS = [
    { label: "Gebruikers",  value: stats?.users,  icon: Users,           path: routes.admin.users  },
    { label: "Evenementen", value: stats?.events,  icon: CalendarDays,    path: routes.admin.events },
    { label: "Ritten",      value: stats?.rides,   icon: Car,             path: routes.admin.rides  },
    { label: "Activiteiten", value: stats?.meals,   icon: UtensilsCrossed, path: routes.admin.meals  },
    { label: "Cosplays",    value: cosplays.length, icon: Sparkles,       path: null                },
    { label: "Uitgaven",    value: formatAmount(totalExpenses), icon: Wallet, path: null           },
  ];

  return (
    <AdminPage>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <AdminPageHeader
        eyebrow="Beheer"
        title={me?.name ?? "Admin"}
        subtitle={`${greeting} · ${dateLabel}`}
      />

      {/* ── Metrics strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {METRICS.map(({ label, value, icon: Icon, path }) => {
          const body = (
            <>
              <span className="flex w-full items-center justify-between gap-2">
                <span className="label-quiet truncate">{label}</span>
                <Icon size={16} className="shrink-0 text-ink-3" />
              </span>
              {statsLoading && typeof value === "number" ? (
                <div className="h-7 w-10 animate-pulse rounded-md bg-sunken" />
              ) : (
                <span className="max-w-full truncate font-display text-[28px] font-extrabold leading-[0.95] tabular-nums text-ink">{value ?? 0}</span>
              )}
            </>
          );
          const box = "card-surface flex min-w-0 flex-col gap-2.5 p-3.5 text-left";
          // A metric with nowhere to go is a plain box, not a button that does nothing.
          return path ? (
            <button key={label} type="button" onClick={() => navigate(path)} className={`${box} transition-colors hover:border-ink-3`}>
              {body}
            </button>
          ) : (
            <div key={label} className={box}>{body}</div>
          );
        })}
      </div>

      {/* ── Upcoming events ─────────────────────────────────────────────────── */}
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b-1.5 border-line px-4 py-3">
          <p className="section-label flex items-center gap-1.5">
            <CalendarDays size={14} /> Aankomende evenementen
          </p>
          <button
            type="button"
            onClick={() => navigate(routes.admin.events)}
            className="hit-area shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-brand-text hover:underline"
          >
            Alle<span className="hidden sm:inline"> evenementen</span> →
          </button>
        </div>

        <div>
          {eventsLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-sunken" />
              ))}
            </div>
          ) : upcomingItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">Geen aankomende evenementen</p>
          ) : (
            upcomingItems.map((item) => {
              const ids = item.type === "single" ? [item.ev.id] : item.events.map((d) => d.ev.id);
              return (
                <EventRow
                  key={item.type === "single" ? item.ev.id : item.multiDayId}
                  item={item}
                  users={allUsers}
                  cosplayCount={cosplays.filter((c) => c.linked_event_ids.some((id) => ids.includes(id))).length}
                />
              );
            })
          )}
        </div>
      </div>

      {/* ── User growth chart ────────────────────────────────────────────────── */}
      <div className="card-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-ink-3" />
          <p className="section-label">Gebruikersgroei</p>
        </div>
        {usersLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-sunken" />
        ) : userGrowthData.length === 0 ? (
          <EmptyState compact icon={<TrendingUp size={22} />} title="Geen data beschikbaar" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={userGrowthData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgb(var(--sunken))" }} />
                <Bar dataKey="newUsers" name="Nieuw" fill="rgb(var(--cyan))" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Line dataKey="cumulative" name="Totaal" type="monotone" stroke="rgb(var(--ink-3))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center justify-end gap-4">
              <span className="label-quiet flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Nieuw
              </span>
              <span className="label-quiet flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-ink-3" /> Cumulatief
              </span>
            </div>
          </>
        )}
      </div>
    </AdminPage>
  );
}
