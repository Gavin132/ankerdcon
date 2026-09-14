import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CalendarPlus, Copy, Check } from "lucide-react";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { CalendarArchive } from "../components/calendar/CalendarArchive";
import { EmptyState } from "../components/common/EmptyState";
import { useUsers } from "../hooks/useUsers";
import { useMeals } from "../hooks/useMeals";
import { useCalendar, useRsvpCalendarEvent, useLeaveCalendarEvent } from "../hooks/useCalendar";
import { env } from "../config/env";

/** Agenda tab: every event, as a list or a month grid, with sign-up and the .ics feed. */
export function CalendarPage() {
  const [calendarView, setCalendarView] = useState<"list" | "calendar">("list");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: users = [] } = useUsers();
  const { data: calendarEvents = [], isLoading } = useCalendar();
  const { data: meals = [] } = useMeals();
  const rsvpMutation = useRsvpCalendarEvent();
  const leaveMutation = useLeaveCalendarEvent();

  const feedUrl = `${env.API_BASE_URL || window.location.origin}/api/calendar/feed.ics`;
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, "webcal:"))}`;

  function copyFeedUrl() {
    navigator.clipboard.writeText(feedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function onCalendarRsvp(id: string, userNames: string[]) {
    for (const userName of userNames) {
      try {
        await rsvpMutation.mutateAsync({ id, userName });
      } catch {
        // silently ignore duplicate sign-ups
      }
    }
  }

  async function onCalendarLeave(id: string, userNames: string[]) {
    for (const userName of userNames) {
      try {
        await leaveMutation.mutateAsync({ id, userName });
      } catch {
        // silently ignore if not found
      }
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (calendarEvents.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={36} />}
        title="Nog geen events"
        description="Zodra er een event gepland is, verschijnt het hier."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setSubscribeOpen((v) => !v)}
          aria-expanded={subscribeOpen}
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            subscribeOpen
              ? "bg-sky-500 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-500"
          }`}
        >
          <CalendarPlus size={12} />
          Abonneren
        </button>
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-0.5" role="group" aria-label="Weergave">
          {(["list", "calendar"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setCalendarView(view)}
              aria-pressed={calendarView === view}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                calendarView === view
                  ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              {view === "list" ? "Lijst" : "Maand"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {subscribeOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="card-surface rounded-xl flex items-center gap-2 px-3.5 py-2.5">
              <p className="flex-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {feedUrl}
              </p>
              <button
                onClick={copyFeedUrl}
                title="Kopieer link"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-sky-500 hover:bg-sky-600 transition-colors px-2.5 py-1.5 text-[11px] font-bold text-white whitespace-nowrap"
              >
                Google Calendar
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {calendarView === "list" ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <CalendarArchive events={calendarEvents} meals={meals} allUsers={users} onRsvp={onCalendarRsvp} onLeave={onCalendarLeave} />
          </motion.div>
        ) : (
          <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <CalendarGrid events={calendarEvents} meals={meals} allUsers={users} onRsvp={onCalendarRsvp} onLeave={onCalendarLeave} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
