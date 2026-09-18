import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useStorySummary } from "../../hooks/useStories";
import { StoryRing } from "../story/StoryRing";
import { StoryViewer } from "../story/StoryViewer";
import { dayShort } from "../../utils/multiDay";
import { tripImage, type Trip } from "../../utils/trips";
import { routes } from "../../config/routes";

interface CollectedStubsProps {
  /** Past trips, newest first. */
  trips: Trip[];
  myNames: string[];
}

/**
 * Agenda › Geweest: every past trip as a torn-off ticket stub, one year at a
 * time, with that year in numbers. Stubs of trips you went to are stamped
 * "Geweest"; the rest are dashed "Gemist". Tapping a stub opens its story
 * photos and a link to the trip.
 */
export function CollectedStubs({ trips, myNames }: CollectedStubsProps) {
  const years = [...new Set(trips.map((t) => t.days[0].date.getFullYear()))];
  const [pickedYear, setYear] = useState<number | null>(null);
  const year = pickedYear !== null && years.includes(pickedYear) ? pickedYear : years[0];
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewDayId, setViewDayId] = useState<string | null>(null);

  const yearTrips = trips.filter((t) => t.days[0].date.getFullYear() === year);
  const { data: storySummary } = useStorySummary(yearTrips.flatMap((t) => t.eventIds));

  if (trips.length === 0) return null;

  const isMine = (p: string) => myNames.includes(p);
  const wentTo = (t: Trip) => t.participants.some(isMine);
  const photosOf = (t: Trip) => t.eventIds.reduce((sum, id) => sum + (storySummary?.[id]?.photo_count ?? 0), 0);
  const thumbOf = (t: Trip) => tripImage(t) ?? t.eventIds.map((id) => storySummary?.[id]?.preview_url).find(Boolean) ?? null;

  const mine = yearTrips.filter(wentTo);
  const conDays = mine.reduce((sum, t) => sum + t.days.filter((d) => d.ev.has_con !== false && d.ev.participants.some(isMine)).length, 0);
  const hotelTrips = mine.filter((t) => t.isHotel).length;
  const photos = yearTrips.reduce((sum, t) => sum + photosOf(t), 0);
  const open = yearTrips.find((t) => t.id === openId) ?? null;

  const stats = [
    { value: `${mine.length}/${yearTrips.length}`, label: "events mee" },
    { value: conDays, label: conDays === 1 ? "con-dag" : "con-dagen" },
    { value: hotelTrips, label: hotelTrips === 1 ? "hoteltrip" : "hoteltrips" },
    { value: photos, label: "foto's gedeeld" },
  ];

  return (
    <section className="space-y-3 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-[26px] font-extrabold uppercase leading-none text-ink">Geweest in {year}</h2>
        {years.length > 1 && (
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-[10px] border-1.5 border-line bg-sunken p-[3px]" role="group" aria-label="Jaar">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => { setYear(y); setOpenId(null); }}
                aria-pressed={y === year}
                className={`shrink-0 rounded-[7px] px-2.5 py-1 font-mono text-[12px] font-semibold transition-colors ${
                  y === year ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]" : "text-ink-2 hover:text-ink"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border-1.5 border-line bg-surface sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col-reverse px-4 py-2.5 ${i % 2 === 1 ? "border-l-1.5 border-line" : ""} ${i >= 2 ? "border-t-1.5 border-line sm:border-t-0" : ""} ${i === 2 ? "sm:border-l-1.5" : ""}`}
          >
            <dt className="text-[12px] text-ink-2">{s.label}</dt>
            <dd className="font-display text-[30px] font-extrabold leading-none tabular-nums text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {yearTrips.map((t) => {
          const went = wentTo(t);
          const thumb = thumbOf(t);
          const tripPhotos = photosOf(t);
          const isOpen = openId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenId(isOpen ? null : t.id)}
              aria-expanded={isOpen}
              className={`stub-notch relative flex min-h-[136px] flex-col overflow-hidden rounded-[10px] p-3 text-left transition-colors ${
                isOpen
                  ? "border-2 border-outline bg-surface"
                  : went
                    ? "border-1.5 border-line bg-surface hover:border-ink-3"
                    : "border-1.5 border-dashed border-line hover:border-ink-3"
              }`}
            >
              <span className="border-b-1.5 border-dashed border-line pb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                {t.dateRange}
              </span>
              {thumb && (
                <span className={`mt-2.5 block h-11 overflow-hidden rounded-md bg-[#0F1519] ${went ? "" : "opacity-50 grayscale"}`}>
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                </span>
              )}
              <span className={`mt-2 font-display text-[20px] font-extrabold uppercase leading-[0.95] [text-wrap:balance] ${went ? "text-ink" : "text-ink-3"}`}>
                {t.title}
              </span>
              <span className="mt-auto pt-2 text-[12px] text-ink-2">
                {t.participants.length} gingen{tripPhotos > 0 ? ` · ${tripPhotos} foto's` : ""}
              </span>
              <span
                className={`absolute right-2.5 top-10 -rotate-[10deg] rounded-md border-2 bg-surface/80 px-1.5 pt-0.5 font-display text-[14px] font-black uppercase leading-tight ${
                  went ? "border-brand-text text-brand-text" : "border-dashed border-ink-3 text-ink-3"
                }`}
              >
                {went ? "Geweest" : "Gemist"}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={open.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-xl bg-sunken p-4">
              <Link
                to={routes.trip.view(open.id, "photos")}
                className="flex items-center gap-2 text-[14px] font-semibold text-ink hover:underline"
              >
                <span className="min-w-0 truncate">{open.title}</span>
                <span className="shrink-0 font-mono text-[11.5px] uppercase text-ink-3">{open.dateRange}</span>
                <ChevronRight size={14} className="ml-auto shrink-0 text-ink-3" />
              </Link>
              {photosOf(open) > 0 ? (
                <div className="flex gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {open.days.map(({ ev, date }) => {
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
              ) : (
                <p className="text-[13px] text-ink-3">
                  Nog geen foto's van deze trip. Je kunt ze toevoegen op het tabblad Foto's.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StoryViewer eventDayId={viewDayId ?? ""} open={viewDayId !== null} onClose={() => setViewDayId(null)} />
    </section>
  );
}
