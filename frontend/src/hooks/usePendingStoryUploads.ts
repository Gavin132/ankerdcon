import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePendingStoryUploadsStore } from "../store/pendingStoryUploads.store";
import { uploadStoryPhoto } from "../services/stories.service";
import { ApiError } from "../lib/api/client";
import { QUERY_KEYS } from "../constants";
import { toast } from "../store/toast.store";

const RETRY_INTERVAL_MS = 20_000;

/** A failure shaped like "couldn't reach the server", not "the server said
 * no" — status 0 is axios's own network/timeout error, 503 and 524 are the
 * backend and Cloudflare saying the same thing. Anything else (a rejected
 * day, a file the server won't take) would fail again identically next
 * time, so only these are worth retrying. Mirrors the check the upload
 * buttons use to decide whether to queue in the first place. */
function isNetworkFailure(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 0 || err.status === 503 || err.status === 524);
}

let flushing = false;

/**
 * Mount once near the app root. Hydrates whatever was queued before this
 * load, then retries it whenever the connection looks like it might be
 * back — on the browser's `online` event, when the tab becomes visible
 * again, and on a slow poll in between (`navigator.onLine` can lie on a
 * wifi network with no real internet). One attempt at a time; the moment an
 * item still fails for a network reason, the rest are left for the next
 * trigger instead of each burning its own timeout in a row.
 */
export function usePendingStoryUploadsFlusher() {
  const qc = useQueryClient();
  const hydrate = usePendingStoryUploadsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function flush() {
      if (flushing || !navigator.onLine) return;
      flushing = true;
      try {
        const items = usePendingStoryUploadsStore.getState().items;
        const sentDays = new Set<string>();
        let droppedCount = 0;

        for (const item of items) {
          try {
            await uploadStoryPhoto(item.eventDayId, item.blob);
            await usePendingStoryUploadsStore.getState().remove(item.id);
            sentDays.add(item.eventDayId);
          } catch (err) {
            if (isNetworkFailure(err)) break; // still no real connection — try again later
            await usePendingStoryUploadsStore.getState().remove(item.id);
            droppedCount += 1;
          }
        }

        if (sentDays.size > 0) {
          sentDays.forEach((id) => qc.invalidateQueries({ queryKey: QUERY_KEYS.storyDay(id) }));
          qc.invalidateQueries({ queryKey: ["stories", "summary"] });
          toast("success", sentDays.size === 1 ? "Wachtende foto alsnog verzonden!" : "Wachtende foto's alsnog verzonden!");
        }
        if (droppedCount > 0) {
          toast(
            "error",
            droppedCount === 1
              ? "Een wachtende foto kon niet worden verzonden en is verwijderd."
              : `${droppedCount} wachtende foto's konden niet worden verzonden en zijn verwijderd.`,
          );
        }
      } finally {
        flushing = false;
      }
    }

    flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", flush);
    const interval = setInterval(flush, RETRY_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", flush);
      clearInterval(interval);
    };
  }, [qc]);
}
