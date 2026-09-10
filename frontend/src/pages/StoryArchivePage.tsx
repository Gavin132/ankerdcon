import { useState } from "react";
import { Camera } from "lucide-react";
import { useSmartBack } from "../hooks/useSmartBack";
import { useCalendar } from "../hooks/useCalendar";
import { useStorySummary } from "../hooks/useStories";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { StoryRing } from "../components/story/StoryRing";
import { StoryViewer } from "../components/story/StoryViewer";
import { routes } from "../config/routes";
import { parseEventDate } from "../utils/date";
import { groupCalendarEntries, formatDateRange, dayShort } from "../utils/multiDay";
import type { CalendarEvent } from "../types";

/** Every con day that has at least one story photo, grouped by trip (same
 * single/multi-day grouping the Hub and calendar already use) and ordered
 * newest trip first — a browsable archive of every story ever posted, not
 * just the current trip's. */
export function StoryArchivePage() {
  const goBack = useSmartBack(routes.more);
  const { data: events = [], isLoading } = useCalendar();
  const allDayIds = events.map((e) => e.id);
  const { data: storySummary, isLoading: summaryLoading } = useStorySummary(allDayIds);
  const [viewDayId, setViewDayId] = useState<string | null>(null);

  const entries = events
    .filter((ev) => storySummary?.[ev.id])
    .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
    .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null);

  // Newest trip first — groupCalendarEntries itself sorts ascending, days
  // within a trip stay chronological, only the trip order is reversed.
  const groups = [...groupCalendarEntries(entries)].reverse();

  const loading = isLoading || summaryLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DetailTopbar title="Story archief" onBack={goBack} />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/10">
              <Camera size={24} className="text-rose-400 dark:text-rose-400/70" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nog geen foto's</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px]">
              Zodra iemand een foto aan een story toevoegt, verschijnt die hier.
            </p>
          </div>
        ) : (
          groups.map((group) => {
            const days = group.type === "single" ? [group] : group.events;
            // The event's own name, not the shared series label (e.g.
            // "HDCC") — a group of days is still one specific event.
            const title = group.type === "single" ? group.ev.event_name : group.events[0].ev.event_name;
            const subtitle =
              group.type === "single"
                ? formatDateRange([group.date])
                : formatDateRange(group.events.map((d) => d.date));
            const key = group.type === "single" ? group.ev.id : group.multiDayId;

            return (
              <div key={key} className="card-surface rounded-2xl overflow-hidden">
                <div className="h-[3px] gradient-brand" />
                <div className="px-5 pt-4 pb-3">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
                </div>
                <div className="flex gap-3 overflow-x-auto px-5 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {days.map(({ ev, date }) => {
                    const summary = storySummary?.[ev.id];
                    if (!summary) return null;
                    return (
                      <StoryRing
                        key={ev.id}
                        label={`${dayShort(date)} ${date.getDate()}`}
                        hasPhotos
                        hasUnseen={summary.has_unseen}
                        previewUrl={summary.preview_url}
                        onClick={() => setViewDayId(ev.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <StoryViewer eventDayId={viewDayId ?? ""} open={viewDayId !== null} onClose={() => setViewDayId(null)} />
    </div>
  );
}
