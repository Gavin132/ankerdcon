import { apiClient } from "../lib/api/client";
import { apiRoutes } from "../config/api-routes";
import type { StoryPhoto, StorySeenState, StoryDaySummary } from "../types";

export async function getStoryPhotos(eventDayId: string): Promise<StoryPhoto[]> {
  const { data } = await apiClient.get<StoryPhoto[]>(apiRoutes.stories.byDay(eventDayId));
  return data;
}

export async function uploadStoryPhoto(eventDayId: string, blob: Blob): Promise<StoryPhoto> {
  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  const { data } = await apiClient.post<StoryPhoto>(apiRoutes.stories.byDay(eventDayId), form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteStoryPhoto(photoId: string): Promise<void> {
  await apiClient.delete(apiRoutes.stories.photo(photoId));
}

export async function getStorySeen(eventDayId: string): Promise<StorySeenState> {
  const { data } = await apiClient.get<StorySeenState>(apiRoutes.stories.seen(eventDayId));
  return data;
}

export async function markStorySeen(eventDayId: string, seq: number): Promise<void> {
  await apiClient.put(apiRoutes.stories.seen(eventDayId), { seq });
}

export async function getStorySummary(eventDayIds: string[]): Promise<Record<string, StoryDaySummary>> {
  if (eventDayIds.length === 0) return {};
  const { data } = await apiClient.get<Record<string, StoryDaySummary>>(apiRoutes.stories.summary(eventDayIds));
  return data;
}
