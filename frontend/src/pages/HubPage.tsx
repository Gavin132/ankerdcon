import { motion } from "framer-motion";
import { MapPin, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "../config/routes";

import { useAuthStore } from "../store/auth.store";
import { UserProfilePopup, type AnchorRect } from "../components/common/UserProfilePopup";
import { HubSkeleton } from "../components/common/Skeleton";
import { ForYouPanel } from "../components/hub/ForYouPanel";
import { useCalendar } from "../hooks/useCalendar";
import { useRides } from "../hooks/useRides";
import { useMeals } from "../hooks/useMeals";
import { useExpenses } from "../hooks/useExpenses";
import { useCurrentUser, useUsers } from "../hooks/useUsers";
import { groupCalendarEntries, dayShort } from "../utils/multiDay";
import { UserAvatar } from "../components/common/UserAvatar";
import { UpcomingEventsCarousel } from "../components/hub/UpcomingEventsCarousel";
import { QuickRideTiles } from "../components/hub/QuickRideTiles";
import { LocationPingModal } from "../components/hub/LocationPingModal";
import { StoryRing } from "../components/story/StoryRing";
import { StoryViewer } from "../components/story/StoryViewer";
import { AddStoryTile } from "../components/story/AddStoryTile";
import { useStorySummary } from "../hooks/useStories";
import { listItem, listContainer } from "../utils/motion";
import { parseEventDate, toDateKey, todayKey, daysBetween } from "../utils/date";
import { useTimeStore } from "../store/time.store";
import type { CalendarEvent, Meal, User } from "../types";

const MAX_CAROUSEL_ITEMS = 8;

const DAYS_NL = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
const MONTHS_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

// ── Page ──────────────────────────────────────────────────────────────────────

export function HubPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>({ top: 0, left: 0, right: 0, height: 0 });
  const [pingOpen, setPingOpen] = useState(false);
  const [storyViewerDayId, setStoryViewerDayId] = useState<string | null>(null);

  const { data: events, isLoading: evLoading } = useCalendar();
  const { data: rides } = useRides();
  const { data: meals } = useMeals();
  const { data: expenses = [] } = useExpenses();
  const { data: users } = useUsers();
  const { data: me } = useCurrentUser();
  const timeOverride = useTimeStore((s) => s.override);

  // `events` is available from useCalendar() regardless of its loading
  // state, so all of this (including the useStorySummary hook call) is safe
  // to compute before the evLoading early return below — it just yields
  // empty results on that first render instead of skipping a hook call,
  // which the Rules of Hooks don't allow.
  const todayStr = todayKey();
  const upcomingEntries = (events ?? [])
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null && toDateKey(x.date) >= todayStr)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const upcomingItems = groupCalendarEntries(upcomingEntries).slice(0, MAX_CAROUSEL_ITEMS);

  // Story rings — one per day of the nearest upcoming trip (a single day for
  // a one-off event, every day for a multi-day group), same "nearest trip"
  // scope the rest of the hub already focuses on.
  const storyDays: { id: string; label: string; dateKey: string }[] = (() => {
    const nearest = upcomingItems[0];
    if (!nearest) return [];
    const dayEntries = nearest.type === "single"
      ? [{ ev: nearest.ev, date: parseEventDate(nearest.ev.date) }]
      : nearest.events;
    return dayEntries
      .filter((d): d is { ev: CalendarEvent; date: Date } => d.date !== null)
      .map(({ ev, date }) => ({ id: ev.id, label: `${dayShort(date)} ${date.getDate()}`, dateKey: toDateKey(date) }));
  })();
  const { data: storySummary } = useStorySummary(storyDays.map((d) => d.id));
  // The quick "add to story" tile targets whichever trip day a photo added
  // right now would land in, by upload time — never whatever day the photo
  // itself depicts. It opens a day early (e.g. an event on the 20th starts
  // accepting photos on the 19th) so people can get a head start once
  // they've arrived; storyDays is already date-ascending and filtered to
  // today-or-later, so the first entry within that 1-day window is it.
  const uploadTargetDay = storyDays.find((d) => {
    const diff = daysBetween(todayStr, d.dateKey);
    return diff <= 1;
  }) ?? null;

  if (evLoading) return <HubSkeleton />;

  const now = timeOverride ?? new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const todayFormatted = `${DAYS_NL[now.getDay()]} ${now.getDate()} ${MONTHS_NL[now.getMonth()]}`;

  // Nearest upcoming event — drives the quick-ride tiles below.
  const event = upcomingItems[0]
    ? (upcomingItems[0].type === "single" ? upcomingItems[0].ev : upcomingItems[0].events[0].ev)
    : null;

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
      {me?.show_greeting !== false && (
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
      )}

      {/* ── Story rings ───────────────────────────────────────────────────── */}
      {storyDays.length > 0 && (
        <motion.div variants={listItem}>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AddStoryTile eventDayId={uploadTargetDay?.id ?? null} />
            <div className="w-px h-16 shrink-0 self-start bg-slate-200 dark:bg-slate-700" />
            {storyDays.map((day) => {
              const summary = storySummary?.[day.id];
              return (
                <StoryRing
                  key={day.id}
                  label={day.label}
                  hasPhotos={!!summary && summary.photo_count > 0}
                  hasUnseen={!!summary?.has_unseen}
                  previewUrl={summary?.preview_url}
                  onClick={() =>
                    summary && summary.photo_count > 0
                      ? setStoryViewerDayId(day.id)
                      : navigate(routes.event.view(day.id))
                  }
                />
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Upcoming events carousel ─────────────────────────────────────── */}
      {upcomingItems.length > 0 && (
        <motion.div variants={listItem}>
          <UpcomingEventsCarousel
            items={upcomingItems}
            allEvents={events ?? []}
            meals={meals ?? []}
            users={users ?? []}
            onNavigate={(id) => navigate(routes.event.view(id))}
            onParticipantClick={(user, rect) => {
              setPopupAnchorRect(rect);
              setPopupUser(user);
            }}
          />
        </motion.div>
      )}

      {/* ── Quick ride shortcuts — switches to the shared restaurant ride
            itself in the evening when a meal still needs transport. ──── */}
      {event && (
        <motion.div variants={listItem}>
          <QuickRideTiles event={event} restaurantMeal={restaurantMeal} rides={rides ?? []} />
        </motion.div>
      )}

      {/* ── Voor jou ───────────────────────────────────────────────────────── */}
      <ForYouPanel
        events={events ?? []}
        rides={rides ?? []}
        meals={meals ?? []}
        expenses={expenses}
        myName={me?.name}
      />

      {/* ── Locatie pingen ────────────────────────────────────────────────── */}
      <motion.div variants={listItem}>
        <button
          type="button"
          onClick={() => setPingOpen(true)}
          className="card-surface-hover flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
            <MapPin size={15} className="text-emerald-500" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">Locatie pingen</span>
            <span className="block text-xs text-slate-400 dark:text-slate-500">Laat de groep weten waar je bent</span>
          </span>
          <ChevronRight size={14} className="shrink-0 text-slate-300 dark:text-slate-600" />
        </button>
      </motion.div>

    </motion.div>

    <UserProfilePopup
      user={popupUser}
      open={popupUser !== null}
      isOwn={currentUser === popupUser?.id}
      anchorRect={popupAnchorRect}
      onClose={() => setPopupUser(null)}
      calendarEvents={events ?? []}
    />

    <LocationPingModal
      open={pingOpen}
      onClose={() => setPingOpen(false)}
      userNames={(users ?? []).map((u) => u.name)}
    />

    <StoryViewer
      eventDayId={storyViewerDayId ?? ""}
      open={storyViewerDayId !== null}
      onClose={() => setStoryViewerDayId(null)}
    />
    </>
  );
}

