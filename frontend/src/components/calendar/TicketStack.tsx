import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AgendaTicket } from "./AgendaTicket";
import { tripImage, type Trip, type TripDay } from "../../utils/trips";
import { getGroupTitle } from "../../utils/multiDay";
import type { Meal, User } from "../../types";

interface TicketStackProps {
  trips: Trip[];
  meals: Meal[];
  users: User[];
  myNames: string[];
  justJoinedId: string | null;
  onJoin: (trip: Trip) => void;
  onLeave: (trip: Trip) => void;
  onToggleDay: (trip: Trip, day: TripDay) => void;
}

/** The stack's bottom padding, which holds the peeking cards. */
const STACK_PAD = 44;

/**
 * Reports its height while it's on screen, so the stack can follow it.
 */
function Measured({ id, onHeight, children }: { id: string; onHeight: (id: string, h: number) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    onHeight(id, el.offsetHeight);
    const ro = new ResizeObserver(() => onHeight(id, el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [id, onHeight]);
  return <div ref={ref}>{children}</div>;
}

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

/**
 * Agenda › upcoming trips as a stack of tickets: the next trip on top, the two
 * after it peeking out underneath. Swipe the ticket, use the arrows or the
 * dots, or ← → while the stack has focus.
 */
export function TicketStack({ trips, meals, users, myNames, justJoinedId, onJoin, onLeave, onToggleDay }: TicketStackProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  // A drag ends in a click on whatever link was under the pointer; swallow it.
  const draggedRef = useRef(false);
  // The stack is exactly as tall as the ticket on top (plus the strip for the
  // cards behind it) and eases between heights, so the arrows below it glide
  // rather than jump — and a short ticket never leaves a tall, empty stack.
  const currentIdRef = useRef<string>();
  const [boxHeight, setBoxHeight] = useState<number | "auto">("auto");
  const reportHeight = useRef((id: string, h: number) => {
    if (id === currentIdRef.current) setBoxHeight(h + STACK_PAD);
  }).current;

  useEffect(() => {
    if (index > trips.length - 1) setIndex(Math.max(0, trips.length - 1));
  }, [index, trips.length]);

  const current = Math.min(index, trips.length - 1);
  const trip = trips[current];
  if (!trip) return null;
  currentIdRef.current = trip.id;
  const peeks = [trips[current + 1], trips[current + 2]];
  const next = trips[current + 1];

  function go(to: number) {
    const clamped = Math.max(0, Math.min(trips.length - 1, to));
    if (clamped === current) return;
    setDirection(clamped > current ? 1 : -1);
    setIndex(clamped);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) go(current + 1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) go(current - 1);
  }

  const peekLabel = (t: Trip) => {
    const img = tripImage(t);
    return (
      <>
        {img && <img src={img} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
        <span className="truncate">{getGroupTitle(t.days)} · {t.dateRange}</span>
      </>
    );
  };

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Komende events"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
      }}
      // The ticket slides ±40px while swapping (and drags with elastic), which
      // would otherwise widen the page and add a horizontal scrollbar.
      className="space-y-3 overflow-x-clip"
    >
      <motion.div className="relative pb-11" initial={false} animate={{ height: boxHeight }} transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
        {peeks[1] && (
          <div aria-hidden className="absolute inset-x-8 bottom-0 top-20 flex items-end gap-2 rounded-[14px] border-1.5 border-line bg-sunken px-4 pb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
            {peekLabel(peeks[1])}
          </div>
        )}
        {peeks[0] && (
          <div aria-hidden className="absolute inset-x-4 bottom-[22px] top-10 flex items-end gap-2 rounded-[14px] border-1.5 border-line bg-surface px-4 pb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
            {peekLabel(peeks[0])}
          </div>
        )}

        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={trip.id}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 40, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -40, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            drag={trips.length > 1 ? "x" : false}
            dragSnapToOrigin
            dragElastic={0.2}
            dragConstraints={{ left: 0, right: 0 }}
            onDragStart={() => { draggedRef.current = true; }}
            onDragEnd={onDragEnd}
            onPointerDown={() => { draggedRef.current = false; }}
            onClickCapture={(e) => {
              if (draggedRef.current) { e.preventDefault(); e.stopPropagation(); draggedRef.current = false; }
            }}
            className="relative z-[2] touch-pan-y"
          >
            <Measured id={trip.id} onHeight={reportHeight}>
              <AgendaTicket
                trip={trip}
                meals={meals}
                users={users}
                myNames={myNames}
                justJoined={justJoinedId === trip.id}
                onJoin={() => onJoin(trip)}
                onLeave={() => onLeave(trip)}
                onToggleDay={(day) => onToggleDay(trip, day)}
              />
            </Measured>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {trips.length > 1 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go(current - 1)}
              disabled={current === 0}
              aria-label="Vorig event"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:cursor-default disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-wrap items-center justify-center gap-0.5">
              {trips.map((t, i) => {
                const mine = t.participants.some((p) => myNames.includes(p));
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`${t.title}, ${t.dateRange}`}
                    aria-current={i === current}
                    title={`${t.title} · ${t.dateRange}`}
                    className="flex h-6 w-6 items-center justify-center"
                  >
                    <span
                      className={`block h-2 rounded-full transition-all ${
                        i === current ? "w-5 bg-outline" : mine ? "w-2 bg-ink-3" : "w-2 bg-line"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => go(current + 1)}
              disabled={current === trips.length - 1}
              aria-label="Volgend event"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border-1.5 border-line bg-surface text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:cursor-default disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="text-center text-[12.5px] text-ink-3">
            {current + 1} van {trips.length}
            {next ? ` · daarna ${next.title}, ${next.dateRange}` : ""}
          </p>
        </>
      )}
    </section>
  );
}
