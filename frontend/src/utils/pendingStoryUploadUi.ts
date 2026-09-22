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
  const isNetworkFailure =
    (err as { isOffline?: boolean })?.isOffline === true ||
    (err instanceof ApiError && (err.status === 0 || err.status === 503 || err.status === 524));
  if (isNetworkFailure) {
    const queued = await usePendingStoryUploadsStore.getState().add(eventDayId, blob);
    if (queued) {
      toast("info", "Geen verbinding — de foto wordt verzonden zodra je weer online bent.");
      return;
    }
  }
  toast("error", "Kon foto niet uploaden. Probeer opnieuw.");
}
