/**
 * The phone's back gesture (and Android's back button) for anything that lies over a page: a sheet, the story
 * viewer, a photo lightbox, a dialog. Without it the gesture goes to the *page underneath*: the router steps back,
 * or, if the overlay was the first thing opened, the app itself is left, while the overlay was never told to close.
 *
 * Each open overlay pushes a throwaway history entry, so the gesture has something of its own to consume first. All
 * overlays share one LIFO stack and one `popstate` listener: when several are open (a confirmation over a form), one
 * back press closes only the one on top, which is exactly what popping the last entry gives, since an overlay can only
 * open after the one under it.
 */
const closers: Array<() => void> = [];
let attached = false;

/** What `history.state` carries on an entry pushed here, to tell it apart from the router's own. */
const MARK = "ankerdSheet";

function onPopState() {
  closers.pop()?.();
}

/**
 * Gives an open overlay a history entry of its own. `close` is called when the person goes back (so it must
 * actually close the overlay). Returns the cleanup to run when the overlay closes by any route: if it closed by itself
 * (the X, a save) the entry it pushed is consumed, so a *later* back press leaves the page instead of landing on a
 * dead entry; if the back gesture closed it there is nothing left to undo.
 *
 * `onOwnsEntry` tells the caller whether the entry exists right now: a sheet that closes by hand goes through
 * `history.back()` when it owns one, so that the URL it may be holding open is not rewritten first (see TripSheet).
 */
export function openBackEntry(close: () => void, onOwnsEntry?: (owns: boolean) => void): () => void {
  // Deferred a tick: React 18 StrictMode (development only) mounts, cleans up and mounts an effect again before
  // anything asynchronous runs. Pushing at once would push twice for one real open, and the phantom mount's cleanup
  // would call history.back(), whose popstate then lands on the second mount and closes the overlay as it opens.
  let cancelled = false;
  let pushed = false;
  const timer = window.setTimeout(() => {
    if (cancelled) return;
    window.history.pushState({ [MARK]: true }, "");
    pushed = true;
    onOwnsEntry?.(true);
    closers.push(close);
    if (!attached) {
      window.addEventListener("popstate", onPopState);
      attached = true;
    }
  }, 0);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    onOwnsEntry?.(false);
    if (!pushed) return;
    // Still in the stack: the overlay closed by itself, not through a popstate. But only undo the entry while it is
    // still the current one: if the router has since replaced or moved past it (the URL held the overlay open and
    // was rewritten, or a button in it navigated elsewhere), stepping back would undo that navigation.
    const at = closers.lastIndexOf(close);
    if (at !== -1) {
      closers.splice(at, 1);
      if (window.history.state?.[MARK] === true) window.history.back();
    }
    if (closers.length === 0 && attached) {
      window.removeEventListener("popstate", onPopState);
      attached = false;
    }
  };
}

/** For tests: forget every overlay and detach the listener. */
export function resetBackStack() {
  closers.length = 0;
  if (attached && typeof window !== "undefined") window.removeEventListener("popstate", onPopState);
  attached = false;
}
