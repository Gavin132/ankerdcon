import { useState } from "react";
import { Camera } from "lucide-react";
import { useStorySummary } from "../../hooks/useStories";
import { StoryRing } from "../../components/story/StoryRing";
import { StoryViewer } from "../../components/story/StoryViewer";
import { AddStoryTile } from "../../components/story/AddStoryTile";
import { daysBetween, toDateKey, todayKey } from "../../utils/date";
import { dayShort } from "../../utils/multiDay";
import { useTrip } from "./tripContext";

/**
 * Event › Foto's: one story ring per day of the trip. Photos can be added
 * from the day before a trip day, same window as the Hub's story row — a
 * photo always lands on the day it's uploaded, never the day it depicts.
 */
export function TripPhotosTab() {
  const { trip } = useTrip();
  const { data: storySummary, isLoading } = useStorySummary(trip.eventIds);
  const [viewDayId, setViewDayId] = useState<string | null>(null);

  const today = todayKey();
  const uploadDay = trip.days.find(({ date }) => {
    const key = toDateKey(date);
    return key >= today && daysBetween(today, key) <= 1;
  });
  const photoCount = trip.days.reduce((sum, d) => sum + (storySummary?.[d.ev.id]?.photo_count ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="card-surface px-4 py-4 sm:px-5">
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AddStoryTile eventDayId={uploadDay?.ev.id ?? null} />
          <div className="h-16 w-px shrink-0 self-start bg-line" />
          {trip.days.map(({ ev, date }) => {
            const summary = storySummary?.[ev.id];
            const hasPhotos = !!summary && summary.photo_count > 0;
            return (
              <StoryRing
                key={ev.id}
                label={`${dayShort(date)} ${date.getDate()}`}
                hasPhotos={hasPhotos}
                hasUnseen={!!summary?.has_unseen}
                previewUrl={summary?.preview_url}
                onClick={() => hasPhotos && setViewDayId(ev.id)}
              />
            );
          })}
        </div>
      </div>

      {!isLoading && photoCount === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
            <Camera size={22} />
          </div>
          <p className="text-sm font-semibold text-ink">Nog geen foto's</p>
          <p className="max-w-[260px] text-xs text-ink-3">
            {uploadDay
              ? "Voeg de eerste foto toe met de camera hierboven."
              : "Vanaf de dag voor het event kun je hier foto's toevoegen."}
          </p>
        </div>
      )}

      <StoryViewer eventDayId={viewDayId ?? ""} open={viewDayId !== null} onClose={() => setViewDayId(null)} />
    </div>
  );
}
