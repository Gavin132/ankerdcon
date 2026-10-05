import { env } from "../config/env";

/** The Push API needs the VAPID public key as raw bytes, not the base64url
 * string it's stored/transmitted as. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Whether the browser has the Push API at all — before asking whether it's
 * actually usable right now (see canOfferPush). */
export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!env.VAPID_PUBLIC_KEY;
}

/** True once this session is running as an installed app (added to the home
 * screen / launched from its icon), not a browser tab. iOS only allows push
 * for an installed app; other platforms don't care either way. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // Safari's own pre-standard flag — the only way to detect this on iOS.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

/** True when push is supported and usable right now — the only case in which
 * a live toggle should be shown. iOS additionally needs the app installed to
 * the home screen; everywhere else, support is enough. */
export function canOfferPush(): boolean {
  return isPushSupported() && (!isIOS() || isStandalone());
}

/** True when push would work if the app were installed first — the case that
 * gets an explanatory "voeg toe aan je beginscherm" row instead of a toggle. */
export function needsHomeScreenInstall(): boolean {
  return isPushSupported() && isIOS() && !isStandalone();
}

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

/** The service worker registration to subscribe through — the one
 * useServiceWorker() already registered, awaited with a timeout so a dev
 * build (which never registers one) fails fast instead of hanging. */
async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const ready = navigator.serviceWorker.ready;
  const timeout = new Promise<never>((_, reject) =>
    window.setTimeout(() => reject(new Error("Geen service worker beschikbaar.")), 8000),
  );
  return Promise.race([ready, timeout]);
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  if (needsHomeScreenInstall()) return "needs-install";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await getRegistration();
    const sub = await reg.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

export interface PushSubscriber {
  subscribe(payload: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void>;
  unsubscribe(endpoint: string): Promise<void>;
}

/** Turns push on for this device: asks permission if needed, subscribes, and
 * tells the backend. Throws with a Dutch message on anything that stops it —
 * the caller shows that message rather than a generic failure. */
export async function subscribeToPush(api: PushSubscriber): Promise<void> {
  if (!canOfferPush()) throw new Error("Pushmeldingen worden hier niet ondersteund.");

  if (Notification.permission === "denied") {
    throw new Error("Meldingen staan uit voor deze site in je browser- of telefooninstellingen.");
  }
  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    if (result !== "granted") throw new Error("Geen toestemming gegeven voor meldingen.");
  }

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast: TS's lib.dom types this parameter against ArrayBuffer specifically,
      // but Uint8Array.from()'s return is typed over the broader ArrayBufferLike —
      // a real mismatch in the type definitions, not in what the browser accepts.
      applicationServerKey: urlBase64ToUint8Array(env.VAPID_PUBLIC_KEY) as BufferSource,
    });
  }
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Aanmelden voor pushmeldingen is niet gelukt.");
  }
  await api.subscribe({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
}

/** Turns push off for this device: tells the backend first (while we still
 * have the endpoint), then unsubscribes the browser itself. */
export async function unsubscribeFromPush(api: PushSubscriber): Promise<void> {
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await api.unsubscribe(sub.endpoint);
  await sub.unsubscribe();
}
