import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ChevronRight } from "lucide-react";
import { useStorySummary } from "../../hooks/useStories";
import { StoryRing } from "../story/StoryRing";
import { StoryViewer } from "../story/StoryViewer";
import { routes } from "../../config/routes";
import { dayShort, formatDateRange, type CalendarItem } from "../../utils/multiDay";
import { tripIdOf } from "../../utils/trips";

/**
 * Agenda › Geschiedenis: photo rings for every past trip that has story
 * photos, newest first — the story archive, next to the trips themselves.
 * Tapping the trip name opens its Foto's tab.
 */
export function PastTripPhotos({ items }: { items: CalendarItem[] }) {
  const dayIds = items.flatMap((item) => (item.type === "single" ? [item.ev.id] : item.events.map((d) => d.ev.id)));
  const { data: storySummary } = useStorySummary(dayIds);
  const [viewDayId, setViewDayId] = useState<string | null>(null);

  const withPhotos = items.filter((item) => {
    const ids = item.type === "single" ? [item.ev.id] : item.events.map((d) => d.ev.id);
    return ids.some((id) => (storySummary?.[id]?.photo_count ?? 0) > 0);
  });
  if (withPhotos.length === 0) return null;

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <p className="section-label flex items-center gap-1.5 px-4 pt-4 pb-1">
        <Camera size={11} className="text-rose-400" />
        Foto's
      </p>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {withPhotos.map((item) => {
          const days = item.type === "single" ? [{ ev: item.ev, date: item.date }] : item.events;
          const tripId = item.type === "single" ? tripIdOf(item.ev) : item.multiDayId;
          return (
            <div key={tripId} className="px-4 py-3">
              <Link
                to={routes.trip.view(tripId, "photos")}
                className="flex items-center gap-2 text-sm font-bold text-slate-900 hover:underline dark:text-white"
              >
                <span className="min-w-0 truncate">{days[0].ev.event_name}</span>
                <span className="shrink-0 text-xs font-medium text-slate-400">{formatDateRange(days.map((d) => d.date))}</span>
                <ChevronRight size={13} className="ml-auto shrink-0 text-slate-300 dark:text-slate-600" />
              </Link>
              <div className="mt-2 flex gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {days.map(({ ev, date }) => {
                  const summary = storySummary?.[ev.id];
                  if (!summary || summary.photo_count === 0) return null;
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
        })}
      </div>
      <StoryViewer eventDayId={viewDayId ?? ""} open={viewDayId !== null} onClose={() => setViewDayId(null)} />
    </div>
  );
}
