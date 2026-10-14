import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadStoryPhoto, uploadStoryVideo } from "../services/stories.service";
import { compressImage } from "../utils/imageCompression";
import { sortByCaptureTime } from "../utils/photoDate";
import { STORY_VIDEO_MAX_BYTES, STORY_VIDEO_WARN_BYTES, isVideoFile, makeVideoPoster, withVideoType } from "../utils/videoPoster";
import { askConfirm } from "../store/confirm.store";
import { isNetworkFailure, queueIfNetworkFailure } from "../utils/pendingStoryUploadUi";
import { QUERY_KEYS } from "../constants";
import { toast } from "../store/toast.store";

export const STORY_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm";

/** More than this in one go would hold the phone busy for minutes on convention wifi. */
const MAX_PER_BATCH = 30;

/**
 * Shared by both story-upload entry points: pick one or more photos or videos, add them to
 * a day's story oldest-first by when they were *taken* (the story shows photos in
 * upload order, so uploading them one after the other in that order is what
 * sorts them). One at a time on purpose: it keeps the order, and a bad
 * connection loses one photo instead of all of them.
 *
 * Failures never stop the batch. A lost connection queues the photos to send later (a
 * video is too big to keep waiting: it fails, and can be added again); the result is one
 * toast, not one per photo.
 */
export function useStoryPhotoPicker(eventDayId: string | null) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  /** `fraction`: how much of the file being sent now has gone out (videos only). */
  const [progress, setProgress] = useState<{ done: number; total: number; fraction?: number } | null>(null);

  async function handleFiles(picked: File[]) {
    if (!eventDayId || picked.length === 0) return;
    let files = picked;
    if (files.length > MAX_PER_BATCH) {
      toast("info", `Maximaal ${MAX_PER_BATCH} bestanden per keer. De eerste ${MAX_PER_BATCH} worden toegevoegd.`);
      files = files.slice(0, MAX_PER_BATCH);
    }

    const resetInput = () => {
      if (inputRef.current) inputRef.current.value = "";
    };
    const isLarge = (f: File, limit: number) => isVideoFile(f) && f.size > limit;
    const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

    // Say so before anything is sent, not after a long upload: a video over the limit is refused,
    // a big one asks first (the rest of the batch is not held up by the answer).
    const tooBig = files.filter((f) => isLarge(f, STORY_VIDEO_MAX_BYTES));
    if (tooBig.length > 0) {
      toast(
        "error",
        `${tooBig.length === 1 ? `Deze video is ${mb(tooBig[0].size)} MB` : `${tooBig.length} video's zijn te groot`}: maximaal ${mb(STORY_VIDEO_MAX_BYTES)} MB. Knip hem in of kies een kortere video.`,
      );
      files = files.filter((f) => !tooBig.includes(f));
    }
    const large = files.filter((f) => isLarge(f, STORY_VIDEO_WARN_BYTES));
    if (large.length > 0) {
      const total = large.reduce((sum, f) => sum + f.size, 0);
      const ok = await askConfirm({
        title: large.length === 1 ? "Grote video" : "Grote video's",
        message:
          `${large.length === 1 ? `Deze video is ${mb(total)} MB` : `Deze ${large.length} video's zijn samen ${mb(total)} MB`}. ` +
          "Op mobiel internet of trage wifi kan uploaden lang duren en mislukken. Op wifi gaat het het snelst. " +
          "Een video wordt niet kleiner gemaakt.",
        confirmLabel: "Toch uploaden",
        cancelLabel: large.length === files.length ? "Annuleren" : "Sla over",
      });
      if (!ok) files = files.filter((f) => !large.includes(f));
    }
    if (files.length === 0) {
      resetInput();
      return;
    }

    setProgress({ done: 0, total: files.length });
    let uploaded = 0;
    let queued = 0;
    let failed = 0;
    let offline = !navigator.onLine;
    const kinds = new Set(files.map((f) => (isVideoFile(f) ? "video" : "foto")));

    try {
      // EXIF is stripped by compressImage, so the dates are read from the originals.
      for (const file of await sortByCaptureTime(files)) {
        if (isVideoFile(file)) {
          if (offline) {
            failed++;
          } else {
            try {
              const video = withVideoType(file);
              const poster = await makeVideoPoster(video);
              await uploadStoryVideo(eventDayId, video, poster, (fraction) => setProgress((p) => p && { ...p, fraction }));
              uploaded++;
            } catch (err) {
              if (isNetworkFailure(err)) offline = true;
              failed++;
            }
          }
          setProgress((p) => p && { done: p.done + 1, total: p.total });
          continue;
        }

        let blob: Blob;
        try {
          blob = await compressImage(file);
        } catch {
          failed++;
          setProgress((p) => p && { done: p.done + 1, total: p.total });
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
        setProgress((p) => p && { done: p.done + 1, total: p.total });
      }
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
      if (uploaded > 0) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.storyDay(eventDayId) });
        qc.invalidateQueries({ queryKey: ["stories", "summary"] });
      }
    }

    // "foto('s)", "video('s)" or, for a mix, "bestand(en)".
    const photos = (n: number) =>
      kinds.size > 1 ? (n === 1 ? "bestand" : "bestanden") : kinds.has("video") ? (n === 1 ? "video" : "video's") : n === 1 ? "foto" : "foto's";
    if (failed === 0 && queued === 0) {
      const Photo = photos(uploaded);
      toast("success", uploaded === 1 ? `${Photo[0].toUpperCase()}${Photo.slice(1)} toegevoegd aan de story!` : `${uploaded} ${photos(uploaded)} toegevoegd aan de story!`);
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
