import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getActiveAnnouncements,
  getAdminAnnouncements,
  updateAdminAnnouncement,
} from "../services/announcements.service";
import type { CreateAnnouncementPayload, UpdateAnnouncementPayload } from "../services/announcements.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: QUERY_KEYS.announcements,
    queryFn: getActiveAnnouncements,
    staleTime: STALE_TIME,
  });
}

export function useAdminAnnouncements() {
  return useQuery({
    queryKey: QUERY_KEYS.adminAnnouncements,
    queryFn: getAdminAnnouncements,
    staleTime: STALE_TIME,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAnnouncementPayload) => createAdminAnnouncement(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminAnnouncements });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.announcements });
    },
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAnnouncementPayload) => updateAdminAnnouncement(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminAnnouncements });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.announcements });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminAnnouncement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminAnnouncements });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.announcements });
    },
  });
}
