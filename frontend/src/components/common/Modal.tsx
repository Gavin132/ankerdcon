import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Tailwind `from-... [via-...] to-...` stops for the thin gradient ribbon
   * across the top of the panel, matching the same accent bar every card
   * elsewhere in the app leads with. Defaults to the general brand gradient. */
  accent?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  accent = "from-sky-400 via-violet-400 to-purple-500",
}: ModalProps) {
  // Capture the mobile swipe-back gesture (and the Android back button) so it
  // closes this modal instead of navigating the page away underneath it.
  // Pushing a throwaway history entry when the modal opens gives the back
  // gesture something of ours to consume first; popping it back out again
  // when the modal closes any other way (X, backdrop, a submit) keeps the
  // history stack from accumulating dead entries that'd need a second
  // back-press to get past later.
  const pushedHistoryRef = useRef(false);

  // Guards backdrop-click-to-close against the "ghost click" some mobile
  // browsers fire a few hundred ms after the tap that opened the modal —
  // a delayed synthetic click landing on this now-covers-the-tap-spot
  // backdrop would otherwise close the modal almost the instant it opens.
  const canCloseOnBackdropRef = useRef(false);
  useEffect(() => {
    canCloseOnBackdropRef.current = false;
    if (!open) return;
    const t = setTimeout(() => {
      canCloseOnBackdropRef.current = true;
    }, 350);
    return () => clearTimeout(t);
  }, [open]);
  const handleBackdropClick = useCallback(() => {
    if (canCloseOnBackdropRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    // The actual pushState is deferred a tick rather than fired immediately:
    // React 18 StrictMode (dev only) double-invokes this effect — mount,
    // clean up, mount again — synchronously, before the browser gets a
    // chance to run anything async. Pushing immediately meant the first
    // (phantom) invocation's cleanup saw pushedHistoryRef already true and
    // called `history.back()`; that navigation resolves asynchronously as a
    // real popstate event, which by then lands on the *second* invocation's
    // listener and closes the modal within a tick of it opening. Deferring
    // the push means the phantom invocation's cleanup runs first and simply
    // cancels the pending timer — nothing was ever pushed, so there's
    // nothing to pop — and only the surviving invocation's push goes through.
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      window.history.pushState({ ankerdModal: true }, "");
      pushedHistoryRef.current = true;
    }, 0);

    function onPopState() {
      pushedHistoryRef.current = false;
      onClose();
    }
    window.addEventListener("popstate", onPopState);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("popstate", onPopState);
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Portaled to <body> — every page wraps its content in a motion.div with
  // its own entrance animation, which leaves a resting `transform` on that
  // ancestor even after settling. A `transform` anywhere up the tree changes
  // what `position: fixed` is positioned relative to (that ancestor's box
  // instead of the true viewport), which is what was actually causing a
  // rendering seam at the very top edge on mobile — not anything in this
  // component's own CSS. Portaling straight to <body> sidesteps that entirely.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — only visible on sm+ where the modal doesn't cover the full screen */}
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm sm:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />

          {/* On mobile: fullscreen slide-up. On sm+: centered dialog. This
              wrapper spans the full viewport (it has to, to center the
              desktop dialog), which means it sits on top of the backdrop and
              would otherwise swallow clicks in the blurred space around the
              dialog — so it closes on click too, with the panel itself
              stopping that click from bubbling up when it lands inside. */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:p-4" onClick={handleBackdropClick}>
            {/* Mobile: fullscreen, no border radius. sm+: auto height, centered card with rounded corners. */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 h-[100dvh] rounded-none sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:max-w-md sm:mx-auto"
              style={{
                boxShadow: "0 -8px 40px rgba(12,42,62,0.18), 0 2px 8px rgba(0,0,0,0.06)",
              }}
              initial={{ y: "100%", opacity: 0.6 }}
              animate={{ y: 0, opacity: 1, transition: { type: "spring", damping: 32, stiffness: 320 } }}
              exit={{ y: "100%", opacity: 0.6, transition: { duration: 0.18, ease: "easeIn" } }}
            >
              {/* Safe-area spacer — a dedicated element carrying the panel's own
                  background, rather than folding env(safe-area-inset-top) into
                  the header's padding: Android Chrome can leave a rendering
                  seam right at that boundary when it's just padding, showing
                  whatever's behind the modal through a hairline gap. Comes
                  before the accent ribbon so the ribbon lands below the
                  status bar on mobile instead of hiding behind it. */}
              <div
                className="shrink-0 bg-white dark:bg-slate-900 sm:hidden"
                style={{ height: "env(safe-area-inset-top, 0px)" }}
              />

              {/* Accent ribbon — the same thin gradient bar every card leads
                  with elsewhere in the app. */}
              <div className={`h-[3px] shrink-0 bg-gradient-to-r ${accent}`} />

              {/* Header */}
              <div className="flex shrink-0 items-start justify-between px-6 pb-4 pt-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-0.5 text-sm text-slate-400">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="ml-3 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable content */}
              <div
                className="flex-1 overflow-y-auto overscroll-contain px-6 py-5"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))" }}
              >
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
