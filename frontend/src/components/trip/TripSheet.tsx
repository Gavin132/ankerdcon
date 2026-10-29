import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { AnimatedHeight } from "../common/AnimatedHeight";
import { peekOffset, PEEK_PX, registerSheet, setSheetHeight, unregisterSheet, useSheetStack } from "./sheetStack";
import { openBackEntry } from "../../utils/backStack";

interface TripSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Shown as a back-chevron in place of the close-adjacent gap; goes to a previous view within the same sheet instead of closing it. */
  onBack?: () => void;
  footer?: React.ReactNode;
  /** For a sheet opened over something that is not itself a TripSheet (an admin drawer): sits above it. A sheet over another TripSheet needs nothing; it is stacked by itself. */
  stacked?: boolean;
  /** Change this when the sheet swaps to another internal view (list ↔ form): the old view fades out, the new one slides in and the sheet eases to its new height. */
  viewKey?: string;
  children: React.ReactNode;
}

/** How many sheets are open; the page behind stays locked until the last one closes. */
let scrollLocks = 0;

// The back gesture / Android back button closes the sheet on top, not the page underneath: each open
// sheet takes a history entry of its own (utils/backStack.ts, shared with every other overlay).

/**
 * A part of a trip (Vervoer, Cosplay, Kamers…), opened as a sheet from the
 * bottom over Event › Overzicht instead of navigating to its own page. Grows
 * with its content up to ~85% of the screen. `onBack` lets a sheet hold more
 * than one internal view (e.g. a list and an add-form) without stacking a
 * second overlay on top — only the header's X fully closes it.
 */
export function TripSheet({ open, onClose, title, subtitle, onBack, footer, viewKey, stacked, children }: TripSheetProps) {
  // True while this sheet owns a history entry of its own (see below).
  const ownsEntry = useRef(false);
  const dragControls = useDragControls();

  // A sheet opened while another is open lies on top of it. The one underneath stays in view as a
  // dimmed strip just above, like a page under a page (see sheetStack.ts), so it is clear where
  // "back" goes.
  const sheetId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const stack = useSheetStack();
  const index = stack.findIndex((s) => s.id === sheetId);
  const covered = index !== -1 && index < stack.length - 1;
  const shift = covered ? peekOffset(stack, index) : 0;

  useEffect(() => {
    if (!open) return;
    registerSheet(sheetId);
    return () => unregisterSheet(sheetId);
  }, [open, sheetId]);

  // The offsets of the sheets underneath follow this sheet's height, which changes with its content.
  useEffect(() => {
    const el = sheetRef.current;
    if (!open || !el) return;
    const report = () => setSheetHeight(sheetId, el.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, sheetId]);

  // Every way of closing by hand (X, backdrop, Escape, a downward drag) goes
  // through the history entry when there is one: going back pops it and the
  // popstate handler then calls onClose, exactly like the back gesture. Calling
  // onClose and undoing the entry afterwards is what used to reopen sheets that
  // the URL holds open (Vervoer, Kamers, a payment linked from a DM): onClose
  // rewrote the URL, and stepping back then landed on the older entry that
  // still had the sheet in it.
  const requestClose = () => {
    if (ownsEntry.current) window.history.back();
    else onClose();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scrollLocks++;
    document.body.style.overflow = "hidden";
    return () => {
      scrollLocks--;
      if (scrollLocks === 0) document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return openBackEntry(onClose, (owns) => {
      ownsEntry.current = owns;
    });
    // Deliberately just `open`: one history entry for the sheet's whole open lifetime, not one per re-render
    // of its onClose prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: index > 0 ? 200 + index * 10 : stacked ? 210 : 150 }}>
          {/* Backdrop */}
          {/* cursor-pointer: iOS Safari does not deliver a tap to a plain div
              unless it looks clickable. */}
          <motion.div
            className={`absolute inset-0 cursor-pointer ${index > 0 ? "bg-scrim/30" : "bg-scrim/50"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={requestClose}
          />

          {/* Slides up or down to leave the strip of the sheet above it showing, when there is one. */}
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto w-full sm:max-w-xl"
            animate={{ y: shift }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            style={{ pointerEvents: covered ? "none" : undefined }}
          >
          {/* Sheet. Dragged down by its handle (the pill and the header); a
              long or quick pull closes it, a short one springs back. A sheet on top of
              others is shorter by one strip each, so theirs stay in view. */}
          <motion.div
            ref={sheetRef}
            className="flex w-full flex-col overflow-hidden rounded-t-sheet border-t-1.5 border-x-1.5 border-line bg-surface sm:border-x-1.5"
            style={{ maxHeight: `calc(85vh - ${Math.max(index, 0) * PEEK_PX}px)` }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) requestClose();
            }}
          >
            {/* Drag handle: touch-action none so the browser does not scroll instead. */}
            <div
              className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden />

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b-1.5 border-line px-5 py-4">
              <div className="flex min-w-0 items-center gap-1.5">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="hit-area -ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                    aria-label="Terug"
                  >
                    <ChevronLeft size={17} />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="line-clamp-2 break-words font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-ink">
                    {title}
                  </h2>
                  {subtitle && <p className="mt-0.5 truncate text-xs text-ink-3">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className={`icon-btn ${covered ? "invisible" : ""}`}
                aria-label="Sluiten"
                tabIndex={covered ? -1 : undefined}
              >
                <X size={16} />
              </button>
            </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <AnimatedHeight>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={viewKey ?? "main"}
                    initial={{ opacity: 0, x: viewKey ? 14 : 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: viewKey ? -14 : 0 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </AnimatedHeight>
            </div>

            {/* Sticky footer — padding-bottom set inline rather than via a
                `safe-bottom` utility class: that class also sets
                padding-bottom, and being defined later in the stylesheet it
                would win the cascade over this element's own `py-4`,
                silently zeroing it out on any device without a safe-area
                inset (i.e. most of them). `max()` keeps the base spacing on
                top of whatever inset there is instead of replacing it. */}
            {footer && (
              <div
                className="shrink-0 border-t-1.5 border-line bg-paper px-5 pt-4"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
