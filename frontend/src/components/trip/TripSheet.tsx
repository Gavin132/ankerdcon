import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

/**
 * A part of a trip (Vervoer, Cosplay, Kamers…), opened as a sheet from the
 * bottom over Event › Overzicht instead of navigating to its own page. Grows
 * with its content up to ~85% of the screen. `onBack` lets a sheet hold more
 * than one internal view (e.g. a list and an add-form) without stacking a
 * second overlay on top — only the header's X fully closes it.
 */
export function TripSheet({ open, onClose, title, subtitle, onBack, footer, viewKey, stacked, children }: TripSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    scrollLocks++;
    document.body.style.overflow = "hidden";
    return () => {
      scrollLocks--;
      if (scrollLocks === 0) document.body.style.overflow = "";
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${stacked ? "z-[210]" : "z-[150]"}`}>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-950/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[20px] border-t-1.5 border-x-1.5 border-line bg-surface sm:max-w-xl sm:border-x-1.5"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
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
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                aria-label="Sluiten"
              >
                <X size={16} />
              </button>
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
