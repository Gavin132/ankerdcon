import { motion } from "framer-motion";
import {
  UtensilsCrossed, BedDouble,
  MapPin, Hotel, ArrowRight, ChevronRight,
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
import { buildGroupColorMap, groupCalendarEntries, firstUpcomingEvents } from "../utils/multiDay";
import { UserAvatar } from "../components/common/UserAvatar";
import { UpcomingEventsCarousel } from "../components/hub/UpcomingEventsCarousel";
import { QuickRideTiles } from "../components/hub/QuickRideTiles";
import { RestaurantRideTiles } from "../components/hub/RestaurantRideTiles";
import { listItem, listContainer } from "../utils/motion";
import { parseEventDate, toDateKey, todayKey } from "../utils/date";
import { computeAllActions } from "../utils/actionItems";
import { useTimeStore } from "../store/time.store";
import type { CalendarEvent, Meal, User } from "../types";

const MAX_CAROUSEL_ITEMS = 8;

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
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>({ top: 0, left: 0, right: 0, height: 0 });

  const { data: events, isLoading: evLoading } = useCalendar();
  const { data: rides } = useRides();
  const { data: meals } = useMeals();
  const { data: expenses = [] } = useExpenses();
  const { data: users } = useUsers();
  const { data: me } = useCurrentUser();
  const timeOverride = useTimeStore((s) => s.override);

  if (evLoading) return <HubSkeleton />;

  const now = timeOverride ?? new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const todayFormatted = `${DAYS_NL[now.getDay()]} ${now.getDate()} ${MONTHS_NL[now.getMonth()]}`;

  const todayStr = todayKey();
  const groupColorMap = buildGroupColorMap(events ?? []);
  const upcomingEntries = (events ?? [])
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null && toDateKey(x.date) >= todayStr)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const upcomingItems = groupCalendarEntries(upcomingEntries).slice(0, MAX_CAROUSEL_ITEMS);

  // Nearest upcoming event — drives the hotel-rooms section below.
  const event = upcomingItems[0]
    ? (upcomingItems[0].type === "single" ? upcomingItems[0].ev : upcomingItems[0].events[0].ev)
    : null;

  const futureMealsCount = (meals ?? []).filter((m) => {
    const d = new Date(m.time.replace(" ", "T"));
    return !isNaN(d.getTime()) && d > now;
  }).length;

  // Nearest upcoming meal that needs transport organised, for the event's own
  // restaurant quick-ride tiles — only relevant when the event has no hotel
  // (hotel events get the hotel-shuttle tiles instead).
  const restaurantMeal: Meal | undefined = event && !event.is_hotel
    ? (meals ?? [])
        .filter((m) => m.linked_event_id === event.id && m.transport_needed)
        .map((m) => ({ m, d: new Date(m.time.replace(" ", "T")) }))
        .filter((x) => !isNaN(x.d.getTime()) && x.d > now)
        .sort((a, b) => a.d.getTime() - b.d.getTime())
        .map((x) => x.m)[0]
    : undefined;

  // Only the soonest event/trip's transport-and-food gaps drive the hub's action
  // alert — later events shouldn't nag you before the one right in front of you
  // is sorted. Restaurant and payment actions aren't tied to a specific event, so
  // those stay unfiltered.
  const allActions = computeAllActions({
    events: firstUpcomingEvents(events ?? []),
    rides: rides ?? [],
    meals: meals ?? [],
    expenses,
    myName: me?.name,
  });

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

      {/* ── Upcoming events carousel ─────────────────────────────────────── */}
      {upcomingItems.length > 0 && (
        <motion.div variants={listItem}>
          <UpcomingEventsCarousel
            items={upcomingItems}
            allEvents={events ?? []}
            groupColorMap={groupColorMap}
            users={users ?? []}
            onNavigate={(id) => navigate(routes.event.view(id))}
            onParticipantClick={(user, rect) => {
              setPopupAnchorRect(rect);
              setPopupUser(user);
            }}
          />
        </motion.div>
      )}

      {/* ── Quick ride shortcuts (only for events with a hotel component) ──── */}
      {event?.is_hotel && (
        <motion.div variants={listItem}>
          <QuickRideTiles event={event} />
        </motion.div>
      )}

      {/* ── Restaurant ride shortcuts (events without a hotel, but with a meal that needs transport) ──── */}
      {event && restaurantMeal && (
        <motion.div variants={listItem}>
          <RestaurantRideTiles event={event} meal={restaurantMeal} rides={rides ?? []} />
        </motion.div>
      )}

      {/* ── Stat tiles ────────────────────────────────────────────────────── */}
      <motion.div variants={listItem}>
        <div className="grid grid-cols-2 gap-3">
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

