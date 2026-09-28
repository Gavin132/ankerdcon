import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { AnimatedHeight } from "../common/AnimatedHeight";

interface TripSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Shown as a back-chevron in place of the close-adjacent gap; goes to a previous view within the same sheet instead of closing it. */
  onBack?: () => void;
  footer?: React.ReactNode;
  /** Change this when the sheet swaps to another internal view (list ↔ form): the old view fades out, the new one slides in and the sheet eases to its new height. */
  viewKey?: string;
  /** For a sheet opened on top of another (a confirmation over a form): sits above it. */
  stacked?: boolean;
  children: React.ReactNode;
}

/** How many sheets are open; the page behind stays locked until the last one closes. */
let scrollLocks = 0;

// ── Back gesture / Android back button ──────────────────────────────────────
// Without this, swiping back on a phone (or pressing Android's back button)
// navigates the *page underneath* — the router moves to wherever history had
// next, but nothing ever told this sheet to close, so it's left open floating
// over whatever page the back gesture landed on. Each open sheet pushes a
// throwaway history entry to give the gesture something of its own to
// consume first, the same trick Modal.tsx uses for the same reason.
//
// A shared LIFO stack (not one listener per sheet) is what makes this correct
// when sheets are stacked (`stacked`, e.g. a confirmation over a form): one
// back press must close only the one on top, not every open sheet at once —
// exactly what popping the last entry off a shared stack gives you, since a
// stacked sheet can only ever have opened after the one under it.
const openSheetClosers: Array<() => void> = [];
let popstateAttached = false;

function handleSheetPopState() {
  openSheetClosers.pop()?.();
}

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

    // Deferred a tick: React 18 StrictMode (dev only) mounts, cleans up and
    // mounts this effect again synchronously before the browser gets a
    // chance to run anything async — pushing immediately would push twice
    // for one real open. See Modal.tsx for the same precaution in detail.
    let cancelled = false;
    let pushed = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      window.history.pushState({ ankerdSheet: true }, "");
      pushed = true;
      ownsEntry.current = true;
      openSheetClosers.push(onClose);
      if (!popstateAttached) {
        window.addEventListener("popstate", handleSheetPopState);
        popstateAttached = true;
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      ownsEntry.current = false;
      if (!pushed) return;
      // Still in the stack means the parent closed this sheet by itself (a
      // save that ends with onClose, say) rather than through a popstate —
      // consume the history entry it pushed so a *later* back press doesn't
      // land on a dead entry instead of leaving the page. But only while that
      // entry is still the current one: if the router has since replaced or
      // moved past it (the URL held the sheet open and was rewritten, or the
      // sheet's own button navigated to another page), stepping back would
      // undo that navigation or reopen the sheet. Already missing from the
      // stack means the back gesture is what got us here (handleSheetPopState
      // popped it and called onClose), so there's nothing left to undo.
      const idx = openSheetClosers.lastIndexOf(onClose);
      if (idx !== -1) {
        openSheetClosers.splice(idx, 1);
        if (window.history.state?.ankerdSheet === true) window.history.back();
      }
      if (openSheetClosers.length === 0 && popstateAttached) {
        window.removeEventListener("popstate", handleSheetPopState);
        popstateAttached = false;
      }
    };
    // Deliberately just `open` — this pushes/pops one history entry for the
    // sheet's whole open lifetime, not on every re-render of its onClose prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${stacked ? "z-[210]" : "z-[150]"}`}>
          {/* Backdrop */}
          {/* cursor-pointer: iOS Safari does not deliver a tap to a plain div
              unless it looks clickable. */}
          <motion.div
            className="absolute inset-0 cursor-pointer bg-slate-950/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={requestClose}
          />

          {/* Sheet. Dragged down by its handle (the pill and the header); a
              long or quick pull closes it, a short one springs back. */}
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[20px] border-t-1.5 border-x-1.5 border-line bg-surface sm:max-w-xl sm:border-x-1.5"
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
                    className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                    aria-label="Terug"
                  >
                    <ChevronLeft size={17} />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="truncate font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em] text-ink">
                    {title}
                  </h2>
                  {subtitle && <p className="mt-0.5 truncate text-xs text-ink-3">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                aria-label="Sluiten"
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
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
