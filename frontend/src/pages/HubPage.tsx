import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Bus, UtensilsCrossed, Wallet, BedDouble,
  MapPin, Hotel, ArrowRight, Layers, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "../config/routes";

import { useAuthStore } from "../store/auth.store";
import { UserProfilePopup, type AnchorRect } from "../components/common/UserProfilePopup";
import { HubSkeleton } from "../components/common/Skeleton";
import { DailyActionCheck } from "../components/hub/DailyActionCheck";
import { CrewSection } from "../components/hub/CrewSection";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useMeals } from "../hooks/useMeals";
import { useExpenses } from "../hooks/useExpenses";
import { useCurrentUser, useUsers } from "../hooks/useUsers";
import { formatDate, formatAmount } from "../utils/format";
import { multiDayColor, getGroupTitle, formatDateRange, dayShort, monthShort } from "../utils/multiDay";
import { UserAvatar } from "../components/common/UserAvatar";
import { listItem, listContainer } from "../utils/motion";
import { parseEventDate, toDateKey, todayKey } from "../utils/date";
import { getRideStatus } from "../utils/rides";
import { computeAllActions } from "../utils/actionItems";
import type { User } from "../types";

const DAYS_NL = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
const MONTHS_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

// ── Stat tile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  metric: React.ReactNode;
  iconBg: string;
  iconColor: string;
  borderHover: string;
  onClick: () => void;
}

function StatTile({ icon: Icon, label, sublabel, metric, iconBg, iconColor, borderHover, onClick }: StatTileProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`card-surface rounded-2xl p-4 text-left flex flex-col gap-4 transition-all duration-150 hover:shadow-md border border-transparent ${borderHover}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={15} className={iconColor} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {sublabel}
        </span>
      </div>
      <div>
        <p className="text-[22px] font-black text-slate-900 dark:text-white leading-none tabular-nums">
          {metric}
        </p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{label}</p>
      </div>
    </motion.button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HubPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>({ top: 0, left: 0, right: 0, height: 0 });

  const { data: events, isLoading: evLoading } = useCalendar();
  const { data: rides } = useRides();
  const { data: meals } = useMeals();
  const { data: expenses = [] } = useExpenses();
  const { data: users } = useUsers();
  const { data: me } = useCurrentUser();

  if (evLoading) return <HubSkeleton />;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const todayFormatted = `${DAYS_NL[now.getDay()]} ${now.getDate()} ${MONTHS_NL[now.getMonth()]}`;

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

  const todayStr = todayKey();
  const event =
    (events ?? [])
      .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
      .filter(({ date }) => date !== null && toDateKey(date) >= todayStr)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())[0]?.ev ?? null;

  const eventDate = event ? parseEventDate(event.date) : null;
  const msUntil = eventDate ? eventDate.getTime() - Date.now() : null;
  const daysUntil = msUntil !== null ? Math.max(0, Math.ceil(msUntil / 86_400_000)) : null;

  // Multi-day group detection
  const groupEvents = event?.multi_day_id
    ? (events ?? [])
        .filter((ev) => ev.multi_day_id === event.multi_day_id)
        .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
        .filter((x): x is { ev: typeof event; date: Date } => x.date !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    : null;
  const isGroupEvent = groupEvents !== null && groupEvents.length > 1;
  const groupColor = isGroupEvent ? multiDayColor(event!.multi_day_id!) : null;
  const groupTitle = isGroupEvent ? getGroupTitle(groupEvents!) : null;
  const groupDateRange = isGroupEvent ? formatDateRange(groupEvents!.map((x) => x.date)) : null;

  const futureRidesCount = (rides ?? []).filter(
    (r) => getRideStatus(r.departure_time).status !== "past",
  ).length;
  const futureMealsCount = (meals ?? []).filter((m) => {
    const d = new Date(m.time.replace(" ", "T"));
    return !isNaN(d.getTime()) && d > now;
  }).length;

  const allActions = computeAllActions({ events: events ?? [], rides: rides ?? [], meals: meals ?? [], expenses, myName: me?.name });

  const hotelRooms: [string, User[]][] = event?.is_hotel
    ? Object.entries(
        (users ?? [])
          .filter((u) => u.hotel_room)
          .reduce<Record<string, User[]>>((acc, u) => {
            (acc[u.hotel_room] = acc[u.hotel_room] || []).push(u);
            return acc;
          }, {}),
      ).sort(([a], [b]) => a.localeCompare(b))
    : [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
    <motion.div
      className="space-y-4"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <motion.div variants={listItem}>
        <div className="flex items-center justify-between pt-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {greeting}
            </p>
            <h1 className="mt-0.5 text-[22px] font-black leading-tight tracking-tight text-slate-900 dark:text-white truncate">
              {me?.name ?? "…"}
            </h1>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 font-medium">{todayFormatted}</p>
          </div>
          {me && (
            <UserAvatar name={me.name} className="h-12 w-12 text-base shrink-0 ml-4" />
          )}
        </div>
      </motion.div>

      {/* ── Action banner ─────────────────────────────────────────────────── */}
      <DailyActionCheck actions={allActions} />

      {/* ── Upcoming event card ───────────────────────────────────────────── */}
      {event && (
        <motion.div variants={listItem}>
          {isGroupEvent ? (
            /* ── Multi-day ── */
            <div className="card-surface rounded-2xl overflow-hidden">
              {/* Accent bar uses group color */}
              <div
                className="h-[3px]"
                style={{ background: `linear-gradient(90deg, ${groupColor!.accent}, ${groupColor!.accent}88)` }}
              />
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
                    style={{ backgroundColor: groupColor!.accent + "18", borderColor: groupColor!.accent + "35" }}
                  >
                    <Layers size={10} style={{ color: groupColor!.accent }} />
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: groupColor!.accent }}
                    >
                      Meerdaags evenement
                    </span>
                  </div>
                  {daysUntil !== null && (
                    <CountdownBadge daysUntil={daysUntil} />
                  )}
                </div>

                <h2 className="text-[20px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                  {groupTitle}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <CalendarDays size={12} />
                    {groupDateRange}
                  </span>
                  <span className="text-sm text-slate-400 dark:text-slate-500">
                    {groupEvents!.length} {groupEvents!.length === 1 ? "dag" : "dagen"}
                  </span>
                </div>

                {/* Per-day rows */}
                <div
                  className="mt-4 space-y-1.5 pl-3"
                  style={{ borderLeft: `2px solid ${groupColor!.accent}30` }}
                >
                  {groupEvents!.map(({ ev: dayEv, date }) => (
                    <button
                      key={dayEv.id}
                      onClick={() => navigate(routes.event.view(dayEv.id))}
                      className="w-full flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors px-3 py-2.5 text-left"
                    >
                      <div className="shrink-0 text-center w-7">
                        <p className="text-[9px] font-bold uppercase text-slate-400">{dayShort(date)}</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{date.getDate()}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{monthShort(date)}</p>
                      </div>
                      <p className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{dayEv.event_name}</p>
                      {dayEv.participants.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex -space-x-1">
                            {dayEv.participants.slice(0, 3).map((p) => {
                              const resolved = (users ?? []).find(u => u.name === p || u.discord_username === p || u.aliases?.includes(p));
                              return <UserAvatar key={p} name={resolved?.name ?? p} user={resolved} className="h-4 w-4 text-[7px] ring-[1.5px] ring-white dark:ring-slate-800" />;
                            })}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums">{dayEv.participants.length}</span>
                        </div>
                      )}
                      <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Single event ── */
            <div
              onClick={() => navigate(routes.event.view(event.id))}
              className="card-surface rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="h-[3px] bg-gradient-to-r from-sky-500 to-indigo-500" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/15 px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-[0.12em]">
                      Aankomend evenement
                    </span>
                  </div>
                  {daysUntil !== null && (
                    <CountdownBadge daysUntil={daysUntil} />
                  )}
                </div>

                <h2 className="text-[20px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                  {event.event_name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <CalendarDays size={12} />
                    {formatDate(event.date)}
                  </span>
                  {event.is_hotel && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <BedDouble size={12} />
                      Hotel inbegrepen
                    </span>
                  )}
                </div>

                {/* Participants */}
                {(users ?? []).length > 0 && event.participants.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all duration-700"
                          style={{ width: `${Math.round((event.participants.length / (users ?? []).length) * 100)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-slate-400 tabular-nums">
                        {event.participants.length}/{(users ?? []).length}
                      </span>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setParticipantsExpanded(v => !v); }}
                      className="flex items-center gap-2 text-left"
                    >
                      <div className="flex -space-x-2">
                        {event.participants.slice(0, 7).map((p) => {
                          const resolved = (users ?? []).find(u => u.name === p || u.discord_username === p || u.aliases?.includes(p));
                          return <UserAvatar key={p} name={resolved?.name ?? p} user={resolved} className="h-6 w-6 text-[9px] ring-2 ring-white dark:ring-slate-900" />;
                        })}
                        {event.participants.length > 7 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-600 dark:text-slate-300">
                            +{event.participants.length - 7}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 hover:text-sky-500 transition-colors">
                        {participantsExpanded ? "Verbergen" : `${event.participants.length} aangemeld`}
                      </span>
                    </button>

                    <AnimatePresence>
                      {participantsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {event.participants.map((p) => {
                              const resolved = (users ?? []).find(u => u.name === p || u.discord_username === p || u.aliases?.includes(p));
                              const displayName = resolved?.name ?? p;
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!resolved) return;
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setPopupAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
                                    setPopupUser(resolved);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-sky-500/30 transition-colors"
                                >
                                  <UserAvatar name={displayName} user={resolved} className="h-3.5 w-3.5 text-[7px] !border-0" />
                                  {displayName}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Stat tiles ────────────────────────────────────────────────────── */}
      <motion.div variants={listItem}>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            icon={Bus}
            label="Ritten gepland"
            sublabel="Transport"
            metric={futureRidesCount}
            iconBg="bg-sky-100 dark:bg-sky-500/10"
            iconColor="text-sky-500"
            borderHover="hover:border-sky-500/20 dark:hover:border-sky-500/15"
            onClick={() => navigate(routes.transport)}
          />
          <StatTile
            icon={UtensilsCrossed}
            label="Maaltijden"
            sublabel="Eten"
            metric={futureMealsCount}
            iconBg="bg-cyan-100 dark:bg-cyan-500/10"
            iconColor="text-cyan-500"
            borderHover="hover:border-cyan-500/20 dark:hover:border-cyan-500/15"
            onClick={() => navigate(routes.food)}
          />
          <StatTile
            icon={Wallet}
            label="Totaal uitgegeven"
            sublabel="Financiën"
            metric={formatAmount(totalSpend)}
            iconBg="bg-violet-100 dark:bg-violet-500/10"
            iconColor="text-violet-500"
            borderHover="hover:border-violet-500/20 dark:hover:border-violet-500/15"
            onClick={() => navigate(routes.finance)}
          />
          <StatTile
            icon={MapPin}
            label="Locatie pingen"
            sublabel="Meer"
            metric={<ArrowRight size={20} className="text-emerald-500" />}
            iconBg="bg-emerald-100 dark:bg-emerald-500/10"
            iconColor="text-emerald-500"
            borderHover="hover:border-emerald-500/20 dark:hover:border-emerald-500/15"
            onClick={() => navigate(routes.more)}
          />
        </div>
      </motion.div>

      {/* ── Hotel rooms ───────────────────────────────────────────────────── */}
      {hotelRooms.length > 0 && (
        <motion.div variants={listItem}>
          <p className="section-label mb-3 flex items-center gap-1.5">
            <Hotel size={11} className="text-sky-500" />
            Hotelkamers
          </p>
          <div className="space-y-2">
            {hotelRooms.map(([room, roomUsers]) => (
              <div key={room} className="card-surface rounded-2xl overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-sky-400 to-blue-400" />
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/10">
                    <BedDouble size={14} className="text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                      Kamer {room}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {roomUsers.map((u) => (
                          <UserAvatar key={u.name} name={u.name} className="h-5 w-5 text-[8px] ring-[1.5px] ring-white dark:ring-slate-900" />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                        {roomUsers.map((u) => u.name).join(", ")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={13} className="shrink-0 text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Crew roster ───────────────────────────────────────────────────── */}
      {(users ?? []).length > 0 && <CrewSection users={users ?? []} />}

    </motion.div>

    <UserProfilePopup
      user={popupUser}
      open={popupUser !== null}
      isOwn={currentUser === popupUser?.id}
      anchorRect={popupAnchorRect}
      onClose={() => setPopupUser(null)}
      calendarEvents={events ?? []}
    />
    </>
  );
}

// ── Countdown badge ───────────────────────────────────────────────────────────

function CountdownBadge({ daysUntil }: { daysUntil: number }) {
  return (
    <div className="shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-center min-w-[52px]">
      <p className="text-[20px] font-black text-slate-900 dark:text-white leading-none tabular-nums">
        {daysUntil === 0 ? "!" : daysUntil}
      </p>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
        {daysUntil === 0 ? "vandaag" : daysUntil === 1 ? "dag" : "dagen"}
      </p>
    </div>
  );
}
