import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, Undo2, Users } from "lucide-react";
import { TripLookback } from "./TripLookback";
import { TripPreview } from "./TripPreview";
import { useStorySummary } from "../../../hooks/useStories";
import { getNow } from "../../../store/time.store";
import { toDateKey, todayKey } from "../../../utils/date";
import { tripImage, type Trip } from "../../../utils/trips";
import { DAY_LABELS } from "../../../constants";
import type { Meal, Ride, StoryDaySummary, User } from "../../../types";

interface RecapViewProps {
  trips: Trip[];
  myNames: string[];
  users: User[];
  rides: Ride[];
  meals: Meal[];
  onJoin: (trip: Trip) => void;
  onLeave: (trip: Trip) => void;
  onManage: (trip: Trip) => void;
}

interface Selection {
  tripId: string | null;
  /** A single day: of a past trip (to filter its photos) or an empty day. */
  dayKey: string | null;
}

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const WEEKDAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (y: number, m: number) => `${y}-${pad(m + 1)}`;
const lastDayKey = (t: Trip) => toDateKey(t.days[t.days.length - 1].date);
const firstDayKey = (t: Trip) => toDateKey(t.days[0].date);

function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/**
 * Agenda › Recap: the month grid, built to look back as much as ahead. Days of
 * past trips show that day's latest story photo (grey when you didn't go), and
 * picking a trip opens its look-back or, for trips still to come, its preview
 * with sign-up. A month strip jumps anywhere; with nothing picked, the side
 * panel lists the month and what happened the same month a year earlier.
 */
export function RecapView({ trips, myNames, users, rides, meals, onJoin, onLeave, onManage }: RecapViewProps) {
  const now = getNow();
  const today = todayKey();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const isMine = (t: Trip) => t.participants.some((p) => myNames.includes(p));
  const isPast = (t: Trip) => lastDayKey(t) < today;
  const visible = mineOnly ? trips.filter(isMine) : trips;
  const { y, m } = month;
  const mk = monthKey(y, m);

  // Weeks (Monday first) covering the month.
  const weeks = useMemo(() => {
    const first = new Date(y, m, 1);
    const lastKey = toDateKey(new Date(y, m + 1, 0));
    let cursor = addDays(toDateKey(first), -((first.getDay() + 6) % 7));
    const out: string[][] = [];
    while (cursor <= lastKey) {
      out.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
      cursor = addDays(cursor, 7);
    }
    return out;
  }, [y, m]);

  const tripByDay = useMemo(() => {
    const map = new Map<string, Trip>();
    for (const t of visible) for (const d of t.days) {
      const key = toDateKey(d.date);
      if (!map.has(key)) map.set(key, t);
    }
    return map;
  }, [visible]);

  const gridStart = weeks[0][0];
  const gridEnd = weeks[weeks.length - 1][6];
  const inGrid = visible.filter((t) => firstDayKey(t) <= gridEnd && lastDayKey(t) >= gridStart);
  const inMonth = visible.filter((t) => t.days.some((d) => toDateKey(d.date).startsWith(mk)));
  const lastYear = visible.filter((t) => firstDayKey(t).startsWith(monthKey(y - 1, m)));
  const selectedTrip = selection?.tripId ? trips.find((t) => t.id === selection.tripId) ?? null : null;

  const summaryIds = useMemo(
    () => [...new Set([...inGrid.filter(isPast), ...lastYear, ...(selectedTrip ? [selectedTrip] : [])].flatMap((t) => t.eventIds))].sort(),
    [inGrid.map((t) => t.id).join(), lastYear.map((t) => t.id).join(), selectedTrip?.id],
  );
  const { data: storySummary } = useStorySummary(summaryIds);

  // Every month from the first event to the last, stretched to include today
  // and whichever month is open, grouped per year.
  const stripYears = useMemo(() => {
    const keys = trips.flatMap((t) => [firstDayKey(t), lastDayKey(t)]).concat(today, `${mk}-01`);
    keys.sort();
    const start = new Date(`${keys[0].slice(0, 7)}-01T00:00:00`);
    const end = new Date(`${keys[keys.length - 1].slice(0, 7)}-01T00:00:00`);
    const years: { year: number; months: number[] }[] = [];
    for (const d = start; d <= end; d.setMonth(d.getMonth() + 1)) {
      const year = d.getFullYear();
      if (years[years.length - 1]?.year !== year) years.push({ year, months: [] });
      years[years.length - 1].months.push(d.getMonth());
    }
    return years;
  }, [trips, today, mk]);

  // Keep the open month centred in the strip, also after jumping years.
  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>("[aria-current='true']");
    if (!strip || !active) return;
    const offset = active.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
    const left = offset - strip.clientWidth / 2 + active.offsetWidth / 2;
    strip.scrollLeft = Math.max(0, left);
  }, [y, m, stripYears]);

  function goToMonth(ny: number, nm: number) {
    const d = new Date(ny, nm, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setSelection(null);
  }

  function selectDay(key: string) {
    const t = tripByDay.get(key);
    if (!key.startsWith(mk)) {
      const d = new Date(`${key}T00:00:00`);
      setMonth({ y: d.getFullYear(), m: d.getMonth() });
    }
    if (t) setSelection({ tripId: t.id, dayKey: isPast(t) && t.days.length > 1 ? key : null });
    else setSelection({ tripId: null, dayKey: key });
  }

  function openTrip(t: Trip) {
    const d = t.days[0].date;
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setSelection({ tripId: t.id, dayKey: null });
  }

  const pastInMonth = inMonth.filter(isPast).length;
  const isCurrentMonth = mk === toDateKey(now).slice(0, 7);

  return (
    <div className="space-y-3">
      {/* ── Month header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Arrows sit together in front of the title, so they stay put however long the month name is. */}
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => goToMonth(y, m - 1)} aria-label="Vorige maand" className="flex h-9 w-9 items-center justify-center rounded-[9px] border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={() => goToMonth(y, m + 1)} aria-label="Volgende maand" className="flex h-9 w-9 items-center justify-center rounded-[9px] border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink">
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[26px] font-extrabold uppercase leading-none text-ink sm:text-[30px]">
              {MONTHS[m]}{y !== now.getFullYear() ? ` ${y}` : ""}
            </h2>
            <p className="section-label mt-1 !font-medium">
              {inMonth.length === 0
                ? "Geen events"
                : `${inMonth.length} ${inMonth.length === 1 ? "event" : "events"}${pastInMonth ? ` · ${pastInMonth} geweest` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isCurrentMonth && (
            <button type="button" onClick={() => goToMonth(now.getFullYear(), now.getMonth())} className="flex h-9 items-center gap-1.5 rounded-[9px] border-1.5 border-line bg-surface px-3 text-[13px] font-semibold text-ink transition-colors hover:border-ink-3">
              <Undo2 size={14} />
              Vandaag
            </button>
          )}
          <div className="flex gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]" role="group" aria-label="Filter">
            {([false, true] as const).map((mine) => (
              <button
                key={String(mine)}
                type="button"
                onClick={() => { setMineOnly(mine); if (mine && selectedTrip && !isMine(selectedTrip)) setSelection(null); }}
                aria-pressed={mineOnly === mine}
                className={`rounded-[7px] px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                  mineOnly === mine ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]" : "text-ink-2 hover:text-ink"
                }`}
              >
                {mine ? "Waar ik was" : "Alles"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Month strip ── */}
      <div ref={stripRef} className="flex overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Maanden">
        {stripYears.map(({ year, months }, gi) => (
          <div key={year} className={`flex shrink-0 items-stretch ${gi > 0 ? "ml-2 border-l-1.5 border-line pl-2" : ""}`}>
            {/* The year sticks to the left edge while its months scroll past. */}
            <span className="sticky left-0 z-[1] flex items-center bg-paper pr-1.5 font-mono text-[11px] font-semibold tabular-nums text-ink-2">
              {year}
            </span>
            <div className="flex gap-[3px]">
              {months.map((sm) => {
                const key = monthKey(year, sm);
                const starts = visible.filter((t) => firstDayKey(t).startsWith(key));
                const active = year === y && sm === m;
                const isNow = key === today.slice(0, 7);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => goToMonth(year, sm)}
                    aria-current={active}
                    title={isNow ? "Deze maand" : undefined}
                    aria-label={`${MONTHS[sm]} ${year}${isNow ? " (deze maand)" : ""}, ${starts.length} ${starts.length === 1 ? "event" : "events"}`}
                    className={`flex w-[44px] shrink-0 flex-col items-center gap-1 rounded-lg border-1.5 px-0.5 pb-1.5 pt-1.5 font-mono text-[10.5px] uppercase transition-colors ${
                      active ? "border-outline bg-surface text-ink" : "border-transparent hover:bg-surface"
                    } ${isNow ? "font-semibold text-ink" : active ? "" : "text-ink-3"}`}
                  >
                    <span className={`leading-none ${isNow ? "border-b-2 border-brand pb-0.5" : "pb-[3px]"}`}>{MONTHS_SHORT[sm]}</span>
                    <span className="flex h-[7px] gap-0.5">
                      {starts.map((t) => (
                        <i
                          key={t.id}
                          className={`block h-[7px] w-[7px] rounded-[2px] ${
                            isPast(t)
                              ? isMine(t) ? "bg-ink-2" : "bg-line"
                              : isMine(t) ? "bg-brand shadow-[inset_0_0_0_1px_rgb(var(--outline))]" : "shadow-[inset_0_0_0_1.5px_rgb(var(--ink-3))]"
                          }`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        {/* ── Grid ── */}
        <div className="overflow-hidden rounded-xl border-1.5 border-line bg-surface">
          <div className="grid grid-cols-7 border-b-1.5 border-line">
            {DAY_LABELS.map((d) => (
              <span key={d} className="py-1.5 text-center font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">{d}</span>
            ))}
          </div>
          <div className="divide-y divide-line">
          {weeks.map((week) => (
            <Week
              key={week[0]}
              week={week}
              monthPrefix={mk}
              today={today}
              trips={visible}
              tripByDay={tripByDay}
              selection={selection}
              selectedTrip={selectedTrip}
              storySummary={storySummary}
              isMine={isMine}
              isPast={isPast}
              onDay={selectDay}
              onTrip={(t) => setSelection({ tripId: t.id, dayKey: null })}
            />
          ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t-1.5 border-line px-2.5 py-2 text-[11.5px] text-ink-3 sm:hidden">
            <span className="flex items-center gap-1.5"><i className="block h-2.5 w-3.5 rounded-[3px] bg-ink-2" />Geweest</span>
            <span className="flex items-center gap-1.5"><i className="block h-2.5 w-3.5 rounded-[3px] bg-brand shadow-[inset_0_0_0_1px_rgb(var(--outline))]" />Jij gaat</span>
            <span className="flex items-center gap-1.5"><i className="block h-2.5 w-3.5 rounded-[3px] shadow-[inset_0_0_0_1.5px_rgb(var(--ink-3))]" />Anderen gaan</span>
          </div>
        </div>

        {/* ── Panel ── */}
        <div className="flex flex-col gap-3">
          {selectedTrip && isPast(selectedTrip) && (
            <TripLookback
              key={selectedTrip.id}
              trip={selectedTrip}
              dayKey={selection?.dayKey ?? null}
              onDayChange={(dayKey) => setSelection({ tripId: selectedTrip.id, dayKey })}
              onClose={() => setSelection(null)}
              myNames={myNames}
              users={users}
              rides={rides}
              meals={meals}
              storySummary={storySummary}
            />
          )}
          {selectedTrip && !isPast(selectedTrip) && (
            <TripPreview
              key={selectedTrip.id}
              trip={selectedTrip}
              onClose={() => setSelection(null)}
              myNames={myNames}
              users={users}
              rides={rides}
              meals={meals}
              onJoin={() => onJoin(selectedTrip)}
              onLeave={() => onLeave(selectedTrip)}
              onManage={() => onManage(selectedTrip)}
            />
          )}
          {!selectedTrip && selection?.dayKey && (
            <EmptyDay dayKey={selection.dayKey} today={today} onClose={() => setSelection(null)} />
          )}
          {!selectedTrip && (
            <MonthOverview
              title={`${MONTHS[m]} ${y}`}
              trips={inMonth}
              lastYear={lastYear}
              lastYearLabel={MONTHS[m]}
              storySummary={storySummary}
              isMine={isMine}
              isPast={isPast}
              onOpen={openTrip}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Week row ──────────────────────────────────────────────────────────────────

interface WeekProps {
  week: string[];
  monthPrefix: string;
  today: string;
  trips: Trip[];
  tripByDay: Map<string, Trip>;
  selection: Selection | null;
  selectedTrip: Trip | null;
  storySummary: Record<string, StoryDaySummary> | undefined;
  isMine: (t: Trip) => boolean;
  isPast: (t: Trip) => boolean;
  onDay: (key: string) => void;
  onTrip: (t: Trip) => void;
}

function Week({ week, monthPrefix, today, trips, tripByDay, selection, selectedTrip, storySummary, isMine, isPast, onDay, onTrip }: WeekProps) {
  const segments: { trip: Trip; col: number; span: number; lane: number }[] = [];
  for (const t of trips) {
    const keys = t.days.map((d) => toDateKey(d.date)).filter((k) => week.includes(k));
    if (keys.length === 0) continue;
    const col = week.indexOf(keys[0]);
    const span = week.indexOf(keys[keys.length - 1]) - col + 1;
    let lane = 0;
    while (segments.some((s) => s.lane === lane && !(col + span <= s.col || s.col + s.span <= col))) lane++;
    segments.push({ trip: t, col, span, lane });
  }

  return (
    <div className="grid grid-cols-7">
      {week.map((key, i) => {
        const date = new Date(`${key}T00:00:00`);
        const trip = tripByDay.get(key);
        const dayId = trip?.days.find((d) => toDateKey(d.date) === key)?.ev.id;
        const preview = trip && isPast(trip) && dayId ? storySummary?.[dayId]?.preview_url : undefined;
        const missed = !!trip && !isMine(trip);
        const isSelected = !!selection && (selection.dayKey === key || (!selection.dayKey && !!selectedTrip && selectedTrip === trip));
        const outside = !key.startsWith(monthPrefix);

        const number = key === today
          ? "bg-brand text-brand-on shadow-[inset_0_0_0_1.5px_rgb(var(--outline))] font-semibold"
          : isSelected
            ? "bg-[rgb(var(--nav-active-bg))] text-[rgb(var(--nav-active-fg))] font-semibold"
            : preview
              ? "bg-[#0F1519]/70 text-white"
              : outside ? "text-ink-3 opacity-60" : key < today ? "text-ink-2" : "text-ink";

        return (
          <button
            key={key}
            type="button"
            onClick={() => onDay(key)}
            style={{ gridColumn: i + 1, gridRow: 1 }}
            aria-label={`${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}${trip ? `, ${trip.title}` : ""}`}
            aria-pressed={isSelected}
            className={`relative flex min-h-[54px] min-w-0 items-start justify-center p-[3px] text-left transition-colors hover:bg-sunken sm:min-h-[88px] sm:justify-start sm:p-1.5 ${
              i > 0 ? "border-l border-line" : ""
            } ${isSelected ? "shadow-[inset_0_0_0_2px_rgb(var(--outline))]" : ""}`}
          >
            {preview && (
              <img
                src={preview}
                alt=""
                loading="lazy"
                className={`absolute inset-[2px] h-[calc(100%-4px)] w-[calc(100%-4px)] rounded-md object-cover sm:inset-[3px] sm:h-[calc(100%-6px)] sm:w-[calc(100%-6px)] ${
                  missed ? "opacity-45 grayscale" : ""
                }`}
              />
            )}
            <span className={`relative z-[1] h-[18px] min-w-[20px] rounded-md px-[3px] text-center font-mono text-[11.5px] leading-[18px] tabular-nums sm:h-5 sm:min-w-[22px] sm:px-1 sm:text-[12.5px] sm:leading-5 ${number}`}>
              {date.getDate()}
            </span>
          </button>
        );
      })}

      {segments.map(({ trip, col, span, lane }) => {
        const past = isPast(trip);
        const mine = isMine(trip);
        const photos = trip.eventIds.reduce((sum, id) => sum + (storySummary?.[id]?.photo_count ?? 0), 0);
        const tone = past
          ? mine
            ? "bg-[#F5F8F9] shadow-[0_0_0_1px_rgba(15,21,25,.6)] sm:bg-[#0F1519]/80 sm:text-[#F5F8F9] sm:shadow-none"
            : "bg-ink-3 sm:bg-[#0F1519]/55 sm:text-[#C9D4D9]"
          : mine
            ? "border-1.5 border-outline bg-brand text-brand-on"
            : "border-1.5 border-ink-3 bg-surface text-ink-2";
        return (
          <button
            key={trip.id}
            type="button"
            onClick={() => onTrip(trip)}
            style={{ gridColumn: `${col + 1} / span ${span}`, gridRow: 1 }}
            aria-label={`${trip.title}, ${trip.dateRange}`}
            className={`relative z-[2] mx-[3px] flex h-[5px] min-w-0 items-center self-end overflow-hidden whitespace-nowrap rounded-[3px] text-[11.5px] font-semibold sm:mx-1.5 sm:h-[22px] sm:gap-1 sm:rounded-md sm:px-1.5 ${
              lane > 0 ? "mb-3 sm:mb-[33px]" : "mb-1 sm:mb-[7px]"
            } ${tone} ${selectedTrip === trip ? "ring-2 ring-outline ring-offset-2 ring-offset-surface" : ""}`}
          >
            <span className="hidden min-w-0 items-center gap-1 sm:flex sm:w-full">
              {past && mine && <Check size={11} strokeWidth={3} className="shrink-0" />}
              <span className="truncate">{trip.title}</span>
              <span className="ml-auto flex shrink-0 items-center gap-0.5 pl-1 font-mono text-[10.5px]">
                {past ? <Camera size={11} /> : <Users size={11} />}
                {past ? photos : trip.participants.length}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Side panel pieces ─────────────────────────────────────────────────────────

function EmptyDay({ dayKey, today, onClose }: { dayKey: string; today: string; onClose: () => void }) {
  const date = new Date(`${dayKey}T00:00:00`);
  const diff = Math.round((date.getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);
  const relative = diff === 0 ? "Vandaag" : diff === 1 ? "Morgen" : diff > 0 ? `Over ${diff} dagen` : `${-diff} dagen geleden`;
  return (
    <div className="card-surface flex flex-col gap-1.5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="section-label">{relative}</p>
        <button type="button" onClick={onClose} className="section-label !text-brand-text hover:underline">Sluiten</button>
      </div>
      <h3 className="font-display text-[26px] font-extrabold uppercase leading-none text-ink">
        {WEEKDAYS[date.getDay()]} {date.getDate()} {MONTHS[date.getMonth()]}
      </h3>
      <p className="text-[13px] text-ink-3">Geen event op deze dag.</p>
    </div>
  );
}

interface MonthOverviewProps {
  title: string;
  trips: Trip[];
  lastYear: Trip[];
  lastYearLabel: string;
  storySummary: Record<string, StoryDaySummary> | undefined;
  isMine: (t: Trip) => boolean;
  isPast: (t: Trip) => boolean;
  onOpen: (t: Trip) => void;
}

function MonthOverview({ title, trips, lastYear, lastYearLabel, storySummary, isMine, isPast, onOpen }: MonthOverviewProps) {
  const previews = (t: Trip) =>
    [...t.eventIds.map((id) => storySummary?.[id]?.preview_url), tripImage(t)].filter((u): u is string => !!u).slice(0, 4);
  const photoCount = (t: Trip) => t.eventIds.reduce((sum, id) => sum + (storySummary?.[id]?.photo_count ?? 0), 0);

  return (
    <div className="card-surface flex flex-col gap-2 p-4">
      <p className="section-label">{title}</p>
      {trips.length === 0 ? (
        <p className="text-[13px] text-ink-3">Geen events deze maand.</p>
      ) : (
        <div className="-mx-2">
          {trips.map((t) => {
            const past = isPast(t);
            const mine = isMine(t);
            const image = tripImage(t);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpen(t)}
                className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] p-2 text-left transition-colors hover:bg-sunken"
              >
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-[#0F1519] font-display text-[14px] font-extrabold uppercase text-[#E6F0F3]">
                  {image ? <img src={image} alt="" className={`h-full w-full object-cover ${past && !mine ? "opacity-60 grayscale" : ""}`} /> : t.title.slice(0, 3)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{t.title}</span>
                  <span className="block truncate font-mono text-[11px] uppercase text-ink-3">{t.dateRange}</span>
                </span>
                <span
                  className={`inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11.5px] font-semibold ${
                    past
                      ? mine ? "bg-ink text-paper" : "bg-sunken text-ink-2"
                      : mine ? "bg-brand-soft text-brand-text" : "bg-sunken text-ink-2"
                  }`}
                >
                  {mine && <Check size={11} strokeWidth={3} />}
                  {past ? (mine ? "Geweest" : "Gemist") : mine ? "Jij gaat" : `${t.participants.length} gaan`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-2 border-t-1.5 border-line pt-3">
        {lastYear.length === 0 ? (
          <p className="text-[13px] text-ink-3">Vorig jaar in {lastYearLabel} stond er niks in de agenda.</p>
        ) : (
          lastYear.map((t) => {
            const thumbs = previews(t);
            const photos = photoCount(t);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpen(t)}
                className="grid w-full grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-xl bg-sunken p-2.5 text-left transition-shadow hover:shadow-[inset_0_0_0_1.5px_rgb(var(--ink-3))]"
              >
                <span className={`grid h-[72px] w-[72px] gap-0.5 overflow-hidden rounded-[9px] bg-[#0F1519] ${thumbs.length > 1 ? "grid-cols-2" : ""}`}>
                  {thumbs.map((src, i) => <img key={i} src={src} alt="" className="h-full w-full object-cover" />)}
                </span>
                <span className="min-w-0">
                  <span className="section-label block">Vorig jaar in {lastYearLabel}</span>
                  <span className="mt-0.5 block font-display text-[20px] font-extrabold uppercase leading-[0.95] text-ink [text-wrap:balance]">{t.title}</span>
                  <span className="mt-1 block text-[12.5px] text-ink-2">
                    {t.dateRange}{photos > 0 ? ` · ${photos} foto's` : ""} · {isMine(t) ? "jij was erbij" : "jij was er niet bij"}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
