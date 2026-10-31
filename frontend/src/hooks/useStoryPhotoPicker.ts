import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadStoryPhoto, uploadStoryVideo } from "../services/stories.service";
import { compressImage } from "../utils/imageCompression";
import { readExifDay, sortByCaptureTime } from "../utils/photoDate";
import { routePhotoDay, type PhotoDay } from "../utils/storyDay";
import { parseEventDate, toDateKey } from "../utils/date";
import { useCalendar } from "./useCalendar";
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
 * sorts them). A photo that says when it was taken (its EXIF) goes to that day of whichever trip it was, or
 * beside the event when it was the day before or after (`routePhotoDay`); the rest goes to `eventDayId`. One at a time on purpose: it keeps the order, and a bad
 * connection loses one photo instead of all of them.
 *
 * Failures never stop the batch. A lost connection queues the photos to send later (a
 * video is too big to keep waiting: it fails, and can be added again); the result is one
 * toast, not one per photo.
 */
export function useStoryPhotoPicker(eventDayId: string | null) {
  const qc = useQueryClient();
  const { data: events } = useCalendar();
  const photoDays = useMemo<PhotoDay[]>(
    () => (events ?? []).flatMap((ev) => {
      const date = parseEventDate(ev.date);
      return date ? [{ id: ev.id, dateKey: toDateKey(date) }] : [];
    }),
    [events],
  );
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
    // EXIF is stripped by compressImage, so the day each photo was taken is read from the original.
    const ordered = await sortByCaptureTime(files);
    const targets = new Map<File, { eventDayId: string; takenOn: string | null }>();
    for (const file of ordered) {
      const day = isVideoFile(file) ? null : await readExifDay(file);
      targets.set(file, (day && routePhotoDay(day, photoDays)) || { eventDayId, takenOn: null });
    }
    const touched = new Set<string>();
    let elsewhere = 0;
    let uploaded = 0;
    let queued = 0;
    let failed = 0;
    let offline = !navigator.onLine;
    const kinds = new Set(files.map((f) => (isVideoFile(f) ? "video" : "foto")));

    try {
      for (const file of ordered) {
        const target = targets.get(file)!;
        if (isVideoFile(file)) {
          if (offline) {
            failed++;
          } else {
            try {
              const video = withVideoType(file);
              const poster = await makeVideoPoster(video);
              await uploadStoryVideo(target.eventDayId, video, poster, (fraction) => setProgress((p) => p && { ...p, fraction }), target.takenOn);
              uploaded++;
              touched.add(target.eventDayId);
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
          outcome = await queueIfNetworkFailure(target.eventDayId, blob, { isOffline: true }, target.takenOn);
        } else {
          try {
            await uploadStoryPhoto(target.eventDayId, blob, target.takenOn);
            outcome = "uploaded";
          } catch (err) {
            // Once the connection is gone the rest would only wait out the timeout too.
            if (isNetworkFailure(err)) offline = true;
            outcome = await queueIfNetworkFailure(target.eventDayId, blob, err, target.takenOn);
          }
        }
        if (target.eventDayId !== eventDayId || target.takenOn) elsewhere++;
        if (outcome === "uploaded") {
          uploaded++;
          touched.add(target.eventDayId);
        } else if (outcome === "queued") queued++;
        else failed++;
        setProgress((p) => p && { done: p.done + 1, total: p.total });
      }
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
      if (uploaded > 0) {
        for (const id of new Set([eventDayId, ...touched])) qc.invalidateQueries({ queryKey: QUERY_KEYS.storyDay(id) });
        qc.invalidateQueries({ queryKey: ["stories", "summary"] });
      }
    }

    // "foto('s)", "video('s)" or, for a mix, "bestand(en)".
    const photos = (n: number) =>
      kinds.size > 1 ? (n === 1 ? "bestand" : "bestanden") : kinds.has("video") ? (n === 1 ? "video" : "video's") : n === 1 ? "foto" : "foto's";
    if (failed === 0 && queued === 0) {
      const Photo = photos(uploaded);
      const added = uploaded === 1 ? `${Photo[0].toUpperCase()}${Photo.slice(1)} toegevoegd aan de story!` : `${uploaded} ${photos(uploaded)} toegevoegd aan de story!`;
      // Said so, or a photo of another day would seem to have gone missing from this one.
      toast("success", elsewhere > 0 ? `${added} ${elsewhere === 1 ? "Hij staat" : "Ze staan"} bij de dag waarop ${elsewhere === 1 ? "hij" : "ze"} gemaakt ${elsewhere === 1 ? "is" : "zijn"}.` : added);
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
