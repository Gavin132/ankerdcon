import { ApiError } from "../lib/api/client";
import { usePendingStoryUploadsStore } from "../store/pendingStoryUploads.store";
import { toast } from "../store/toast.store";

/** Shared by both story-upload entry points (the event-page button and the
 * Hub's "add" tile): on a network-shaped failure, queue the photo instead of
 * just failing, so it sends itself once the connection recovers. Anything
 * else (a rejected file, a day that no longer exists) still surfaces as a
 * normal error. */
export async function queueOrToastUploadError(
  eventDayId: string,
  blob: Blob,
  err: unknown | { isOffline: true },
): Promise<void> {
  const outcome = await queueIfNetworkFailure(eventDayId, blob, err);
  if (outcome === "queued") {
    toast("info", "Geen verbinding — de foto wordt verzonden zodra je weer online bent.");
    return;
  }
  toast("error", "Kon foto niet uploaden. Probeer opnieuw.");
}

/** The quiet half of the above, for batches that sum up in one toast at the end:
 * `"queued"` when the failure looked like a lost connection and the photo is now
 * waiting in the queue, `"failed"` for anything else. */
export async function queueIfNetworkFailure(
  eventDayId: string,
  blob: Blob,
  err: unknown | { isOffline: true },
): Promise<"queued" | "failed"> {
  if (!isNetworkFailure(err)) return "failed";
  const queued = await usePendingStoryUploadsStore.getState().add(eventDayId, blob);
  return queued ? "queued" : "failed";
}

export function isNetworkFailure(err: unknown | { isOffline: true }): boolean {
  return (
    (err as { isOffline?: boolean })?.isOffline === true ||
    (err instanceof ApiError && (err.status === 0 || err.status === 503 || err.status === 524))
  );
}
