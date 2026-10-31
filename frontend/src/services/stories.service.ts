import { apiClient, UPLOAD_TIMEOUT_MS, VIDEO_UPLOAD_TIMEOUT_MS } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import { filenameFromContentDisposition, triggerBlobDownload } from "../utils/downloadFile";
import type { StoryPhoto, StoryDaySummary, UserStoryPhoto } from "../types";

export async function getStoryPhotos(eventDayId: string, takenOn?: string | null): Promise<StoryPhoto[]> {
  const { data } = await apiClient.get<StoryPhoto[]>(apiRoutes.stories.byDay(eventDayId, takenOn));
  return data;
}

export async function getUserPhotos(identifier: string): Promise<UserStoryPhoto[]> {
  const { data } = await apiClient.get<UserStoryPhoto[]>(apiRoutes.stories.byUser(identifier));
  return data;
}

export async function uploadStoryPhoto(eventDayId: string, blob: Blob, takenOn?: string | null): Promise<StoryPhoto> {
  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  const { data } = await apiClient.post<StoryPhoto>(apiRoutes.stories.byDay(eventDayId, takenOn), form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return data;
}

/** A video as it came from the phone, with the still frame made of it. `onProgress` gets 0–1. */
export async function uploadStoryVideo(
  eventDayId: string,
  video: File,
  poster: Blob,
  onProgress?: (fraction: number) => void,
  takenOn?: string | null,
): Promise<StoryPhoto> {
  const form = new FormData();
  form.append("file", video, video.name);
  form.append("poster", poster, "poster.jpg");
  const { data } = await apiClient.post<StoryPhoto>(apiRoutes.stories.byDay(eventDayId, takenOn), form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: VIDEO_UPLOAD_TIMEOUT_MS,
    onUploadProgress: (e) => e.total && onProgress?.(Math.min(1, e.loaded / e.total)),
  });
  return data;
}

export async function deleteStoryPhoto(photoId: string): Promise<void> {
  await apiClient.delete(apiRoutes.stories.photo(photoId));
}

export async function downloadStoryPhoto(photoId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(apiRoutes.stories.download(photoId), {
    responseType: "blob",
  });
  return data;
}

/** Every photo of this day, saved as one zip through the browser's normal download flow.
 * `timeout: 0`: the server streams it while building it, so it legitimately takes a
 * while for a day with many photos — nothing to time out on. */
export async function downloadAllStoryPhotos(eventDayId: string, takenOn?: string | null): Promise<void> {
  const res = await apiClient.get<Blob>(apiRoutes.stories.downloadAll(eventDayId, takenOn), {
    responseType: "blob",
    timeout: 0,
  });
  triggerBlobDownload(res.data, filenameFromContentDisposition(res.headers["content-disposition"], "fotos.zip"));
}

export async function markStorySeen(eventDayId: string, seq: number): Promise<void> {
  await apiClient.put(apiRoutes.stories.seen(eventDayId), { seq });
}

export async function getStorySummary(eventDayIds: string[]): Promise<Record<string, StoryDaySummary>> {
  if (eventDayIds.length === 0) return {};
  const { data } = await apiClient.get<Record<string, StoryDaySummary>>(apiRoutes.stories.summary(eventDayIds));
  return data;
}
