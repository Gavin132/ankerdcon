import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStoryPhotos,
  deleteStoryPhoto,
  markStorySeen,
  getStorySummary,
  getUserPhotos,
} from "../services/stories.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { StoryDaySummary, StorySeenState } from "../types";

/** `alwaysFresh` is for the viewer: members upload to the same day while
 * others are watching, and the ring (from the summary) already says there's a
 * new photo — so opening the story has to ask again instead of trusting a list
 * cached up to STALE_TIME ago, or the new photo is missing until it's reopened. */
export function useStoryPhotos(eventDayId: string, options?: { enabled?: boolean; alwaysFresh?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.storyDay(eventDayId),
    queryFn: () => getStoryPhotos(eventDayId),
    staleTime: options?.alwaysFresh ? 0 : STALE_TIME,
    enabled: options?.enabled ?? !!eventDayId,
  });
}

/** Every photo one member has uploaded, newest first (their profile). */
export function useUserPhotos(identifier: string) {
  return useQuery({
    queryKey: QUERY_KEYS.userPhotos(identifier),
    queryFn: () => getUserPhotos(identifier),
    staleTime: STALE_TIME,
    enabled: !!identifier,
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
    // The rings are how people notice new photos, so they shouldn't wait for a
    // refocus; this only runs while the page is visible.
    refetchInterval: 60_000,
    enabled: eventDayIds.length > 0,
  });
}
