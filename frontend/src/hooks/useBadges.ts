import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignBadgeToUser,
  createAdminBadge,
  deleteAdminBadge,
  getAdminBadges,
  getBadges,
  reorderBadges,
  unassignBadgeFromUser,
  updateAdminBadge,
} from "../services/badges.service";
import type { CreateBadgePayload, UpdateBadgePayload } from "../services/badges.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";

export function useBadges() {
  return useQuery({
    queryKey: QUERY_KEYS.badges,
    queryFn: getBadges,
    staleTime: STALE_TIME,
  });
}

export function useAdminBadges() {
  return useQuery({
    queryKey: QUERY_KEYS.adminBadges,
    queryFn: getAdminBadges,
    staleTime: STALE_TIME,
  });
}

export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBadgePayload) => createAdminBadge(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBadges });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.badges });
    },
  });
}

export function useUpdateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBadgePayload) => updateAdminBadge(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBadges });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.badges });
    },
  });
}

export function useDeleteBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminBadge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBadges });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.badges });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useReorderBadges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; display_order: number }[]) => reorderBadges(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminBadges });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.badges });
    },
  });
}

export function useAssignBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, badgeId }: { userId: string; badgeId: string }) =>
      assignBadgeToUser(userId, badgeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useUnassignBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, badgeId }: { userId: string; badgeId: string }) =>
      unassignBadgeFromUser(userId, badgeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}
