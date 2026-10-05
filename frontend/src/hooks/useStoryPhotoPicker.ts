import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadStoryPhoto } from "../services/stories.service";
import { compressImage } from "../utils/imageCompression";
import { sortByCaptureTime } from "../utils/photoDate";
import { isNetworkFailure, queueIfNetworkFailure } from "../utils/pendingStoryUploadUi";
import { QUERY_KEYS } from "../constants";
import { toast } from "../store/toast.store";

export const STORY_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

/** More than this in one go would hold the phone busy for minutes on convention wifi. */
const MAX_PER_BATCH = 30;

/**
 * Shared by both story-upload entry points: pick one or more photos, add them to
 * a day's story oldest-first by when they were *taken* (the story shows photos in
 * upload order, so uploading them one after the other in that order is what
 * sorts them). One at a time on purpose: it keeps the order, and a bad
 * connection loses one photo instead of all of them.
 *
 * Failures never stop the batch. A lost connection queues the rest to send later;
 * the result is one toast, not one per photo.
 */
export function useStoryPhotoPicker(eventDayId: string | null) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleFiles(picked: File[]) {
    if (!eventDayId || picked.length === 0) return;
    let files = picked;
    if (files.length > MAX_PER_BATCH) {
      toast("info", `Maximaal ${MAX_PER_BATCH} foto's per keer. De eerste ${MAX_PER_BATCH} worden toegevoegd.`);
      files = files.slice(0, MAX_PER_BATCH);
    }

    setProgress({ done: 0, total: files.length });
    let uploaded = 0;
    let queued = 0;
    let failed = 0;
    let offline = !navigator.onLine;

    try {
      // EXIF is stripped by compressImage, so the dates are read from the originals.
      for (const file of await sortByCaptureTime(files)) {
        let blob: Blob;
        try {
          blob = await compressImage(file);
        } catch {
          failed++;
          setProgress((p) => p && { ...p, done: p.done + 1 });
          continue;
        }

        let outcome: "uploaded" | "queued" | "failed";
        if (offline) {
          outcome = await queueIfNetworkFailure(eventDayId, blob, { isOffline: true });
        } else {
          try {
            await uploadStoryPhoto(eventDayId, blob);
            outcome = "uploaded";
          } catch (err) {
            // Once the connection is gone the rest would only wait out the timeout too.
            if (isNetworkFailure(err)) offline = true;
            outcome = await queueIfNetworkFailure(eventDayId, blob, err);
          }
        }
        if (outcome === "uploaded") uploaded++;
        else if (outcome === "queued") queued++;
        else failed++;
        setProgress((p) => p && { ...p, done: p.done + 1 });
      }
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
      if (uploaded > 0) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.storyDay(eventDayId) });
        qc.invalidateQueries({ queryKey: ["stories", "summary"] });
      }
    }

    const photos = (n: number) => (n === 1 ? "foto" : "foto's");
    if (failed === 0 && queued === 0) {
      toast("success", uploaded === 1 ? "Foto toegevoegd aan de story!" : `${uploaded} foto's toegevoegd aan de story!`);
    } else if (failed === 0) {
      toast("info", `${uploaded > 0 ? `${uploaded} toegevoegd, ` : ""}${queued} ${photos(queued)} ${queued === 1 ? "wordt" : "worden"} verzonden zodra je weer online bent.`);
    } else {
      toast(
        "error",
        `${failed} ${photos(failed)} ${failed === 1 ? "kon" : "konden"} niet worden toegevoegd` +
          (uploaded + queued > 0 ? `, ${uploaded + queued} wel.` : ". Probeer opnieuw."),
      );
    }
  }

  return {
    inputRef,
    /** Spread onto the hidden `<input type="file">`. */
    inputProps: {
      type: "file" as const,
      accept: STORY_PHOTO_ACCEPT,
      multiple: true,
      className: "hidden",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(Array.from(e.target.files ?? [])),
    },
    busy: progress !== null,
    progress,
    open: () => inputRef.current?.click(),
  };
}
