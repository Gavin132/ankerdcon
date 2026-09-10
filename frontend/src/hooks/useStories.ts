import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStoryPhotos,
  uploadStoryPhoto,
  deleteStoryPhoto,
  getStorySeen,
  markStorySeen,
  getStorySummary,
} from "../services/stories.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { StoryDaySummary, StorySeenState } from "../types";

export function useStoryPhotos(eventDayId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.storyDay(eventDayId),
    queryFn: () => getStoryPhotos(eventDayId),
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? !!eventDayId,
  });
}

export function useUploadStoryPhoto(eventDayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blob: Blob) => uploadStoryPhoto(eventDayId, blob),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.storyDay(eventDayId) });
      qc.invalidateQueries({ queryKey: ["stories", "summary"] });
    },
  });
}

export function useDeleteStoryPhoto(eventDayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => deleteStoryPhoto(photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.storyDay(eventDayId) });
      qc.invalidateQueries({ queryKey: ["stories", "summary"] });
    },
  });
}

export function useStorySeen(eventDayId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.storySeen(eventDayId),
    queryFn: () => getStorySeen(eventDayId),
    staleTime: STALE_TIME,
    enabled: options?.enabled ?? !!eventDayId,
  });
}

/** Fires once when a story viewer closes (not per-tap) — updates the
 * seen-watermark and, optimistically, the local seen/summary caches so the
 * story ring stops showing "unseen" the instant the viewer closes instead
 * of waiting on a refetch round-trip. */
export function useMarkStorySeen(eventDayId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seq: number) => markStorySeen(eventDayId, seq),
    onMutate: async (seq: number) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.storySeen(eventDayId) });
      const prevSeen = qc.getQueryData<StorySeenState>(QUERY_KEYS.storySeen(eventDayId));
      qc.setQueryData<StorySeenState>(QUERY_KEYS.storySeen(eventDayId), {
        event_day_id: eventDayId,
        last_seen_seq: Math.max(prevSeen?.last_seen_seq ?? 0, seq),
      });

      // Any cached summary query (regardless of exactly which day ids it
      // covers) may include this day — patch its has_unseen flag directly.
      const prevSummaries = qc.getQueriesData<Record<string, StoryDaySummary>>({
        queryKey: ["stories", "summary"],
      });
      qc.setQueriesData<Record<string, StoryDaySummary>>({ queryKey: ["stories", "summary"] }, (old) => {
        if (!old || !old[eventDayId]) return old;
        return {
          ...old,
          [eventDayId]: {
            ...old[eventDayId],
            has_unseen: old[eventDayId].latest_seq > seq ? old[eventDayId].has_unseen : false,
          },
        };
      });

      return { prevSeen, prevSummaries };
    },
    onError: (_err, _seq, context) => {
      if (context?.prevSeen) qc.setQueryData(QUERY_KEYS.storySeen(eventDayId), context.prevSeen);
      context?.prevSummaries?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.storySeen(eventDayId) });
      qc.invalidateQueries({ queryKey: ["stories", "summary"] });
    },
  });
}

export function useStorySummary(eventDayIds: string[]) {
  return useQuery({
    queryKey: QUERY_KEYS.storySummary(eventDayIds),
    queryFn: () => getStorySummary(eventDayIds),
    staleTime: STALE_TIME,
    enabled: eventDayIds.length > 0,
  });
}
