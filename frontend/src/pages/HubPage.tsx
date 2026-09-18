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
import { UpcomingEventsCarousel } from "../components/hub/UpcomingEventsCarousel";
import { QuickRideTiles } from "../components/hub/QuickRideTiles";
import { MealTodayCard } from "../components/hub/MealTodayCard";
import { LocationPingModal } from "../components/hub/LocationPingModal";
import { StoryRing } from "../components/story/StoryRing";
import { StoryViewer } from "../components/story/StoryViewer";
import { AddStoryTile } from "../components/story/AddStoryTile";
import { useStorySummary } from "../hooks/useStories";
import { listItem, listContainer } from "../utils/motion";
import { parseEventDate, toDateKey, todayKey } from "../utils/date";
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

  // Story rings — one per day of whichever trip is closest in date, past or
  // upcoming: the running one during an event, and in between two events the
  // one that's nearer (the one just gone stays until the next is closer). All
  // of its days are shown, including the ones already over.
  const storyDays: { id: string; label: string; dateKey: string }[] = (() => {
    const all = (events ?? [])
      .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
      .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null);
    const dayMs = 86_400_000;
    const todayMs = new Date(`${todayStr}T00:00:00`).getTime();
    // Days from today to the trip: 0 while it's on, else to its nearest edge.
    // On a tie the upcoming trip wins (its distance is nudged down by half a day).
    const distance = (days: { date: Date }[]) => {
      const first = Math.min(...days.map((d) => d.date.getTime()));
      const last = Math.max(...days.map((d) => d.date.getTime()));
      if (todayMs < first) return (first - todayMs) / dayMs - 0.5;
      if (todayMs > last) return (todayMs - last) / dayMs;
      return -1;
    };
    const closest = groupCalendarEntries(all)
      .map((item) => ({ item, d: distance(item.type === "single" ? [item] : item.events) }))
      .sort((a, b) => a.d - b.d)[0]?.item;
    if (!closest) return [];
    const dayEntries = closest.type === "single"
      ? [{ ev: closest.ev, date: closest.date as Date | null }]
      : closest.events;
    return dayEntries
      .filter((d): d is { ev: CalendarEvent; date: Date } => d.date !== null)
      .map(({ ev, date }) => ({ id: ev.id, label: `${dayShort(date)} ${date.getDate()}`, dateKey: toDateKey(date) }));
  })();
  const { data: storySummary } = useStorySummary(storyDays.map((d) => d.id));
  // The quick "add to story" tile targets whichever trip day a photo added
  // right now would land in, by upload time: today's day, else the most recent
  // day that's over, else the trip's first day (same rule as tripUploadDay).
  const uploadTargetDay =
    storyDays.find((d) => d.dateKey === todayStr) ??
    [...storyDays].reverse().find((d) => d.dateKey < todayStr) ??
    storyDays[0] ??
    null;

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
      className="space-y-6"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      {me?.show_greeting !== false && (
        <motion.div variants={listItem}>
          <div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                {greeting} · {todayFormatted}
              </p>
              <h1 className="mt-1 truncate font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] text-ink md:text-[42px]">
                {me?.name ?? "…"}
              </h1>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Story rings ───────────────────────────────────────────────────── */}
      {storyDays.length > 0 && (
        <motion.div variants={listItem}>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AddStoryTile eventDayId={uploadTargetDay?.id ?? null} />
            <div className="w-px h-16 shrink-0 self-start bg-line" />
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

      {/* Two columns on wide screens: the trip on the left, what needs doing on the right. */}
      <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] xl:items-start xl:gap-8 xl:space-y-0">
        <div className="min-w-0 space-y-6">
          {/* ── Upcoming events carousel ───────────────────────────────── */}
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

          {/* ── A mealplan today: shortcut to it, above the ride cards ── */}
          <MealTodayCard meals={meals ?? []} myNames={[me?.name, ...(me?.aliases ?? [])].filter((n): n is string => !!n)} />

          {/* ── Quick ride shortcuts — switches to the shared restaurant ride
                itself in the evening when a meal still needs transport. ── */}
          {event && (
            <motion.div variants={listItem}>
              <QuickRideTiles event={event} restaurantMeal={restaurantMeal} rides={rides ?? []} />
            </motion.div>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {/* ── Voor jou ─────────────────────────────────────────────────── */}
          <ForYouPanel
            events={events ?? []}
            rides={rides ?? []}
            meals={meals ?? []}
            expenses={expenses}
            myName={me?.name}
          />

          {/* ── Locatie pingen ───────────────────────────────────────────── */}
          <motion.div variants={listItem}>
            <button
              type="button"
              onClick={() => setPingOpen(true)}
              className="card-surface-hover flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <MapPin size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Locatie pingen</span>
                <span className="block text-xs text-ink-3">Laat de groep weten waar je bent</span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-ink-3" />
            </button>
          </motion.div>
        </div>
      </div>

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

