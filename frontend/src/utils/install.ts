import { isStandalone, isIOS } from "./push";

/**
 * Putting the app on the home screen. iOS only allows push messages for an installed app, and on every phone
 * an installed app opens faster and without the browser bars. Chrome and friends offer to install through a
 * `beforeinstallprompt` event that fires once, early, so it is caught here at start-up and kept until asked
 * for; Safari has no such thing, only the Share menu, so there it is a how-to.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Call once, as the app starts: the browser fires the event only once, possibly before anything is on screen. */
export function captureInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type InstallKind = "prompt" | "ios";

/** How this device can install the app right now: `prompt` (one tap), `ios` (the Share menu), or null when
 * it already runs as an app, is not a phone, or has no way to. */
export function installKind(): InstallKind | null {
  if (typeof window === "undefined" || isStandalone()) return null;
  // A desktop browser can install too, but a "put it on your home screen" card is for phones.
  if (!window.matchMedia?.("(pointer: coarse)").matches) return null;
  if (deferred) return "prompt";
  return isIOS() ? "ios" : null;
}

/** Shows the browser's install dialog. True when the person accepted it. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // an event can be used once
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
}

// ── "Not now" ────────────────────────────────────────────────────────────────

const DISMISSED_KEY = "ankerd:install-hint-dismissed";
/** After "Later" the card stays away this long. */
export const DISMISS_DAYS = 30;

/** Real device time, deliberately not getNow(): this is about the phone, not about an event's calendar. */
export function installHintDismissed(now: number = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && now - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissInstallHint(now: number = Date.now()): void {
  try {
    localStorage.setItem(DISMISSED_KEY, String(now));
  } catch {
    // Private mode and the like: the card simply comes back next time.
  }
}
