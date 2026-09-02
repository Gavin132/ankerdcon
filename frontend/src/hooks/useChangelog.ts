import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAdminChangelogEntry,
  deleteAdminChangelogEntry,
  getAdminChangelog,
  getChangelog,
  updateAdminChangelogEntry,
} from "../services/changelog.service";
import type { CreateChangelogEntryPayload, UpdateChangelogEntryPayload } from "../services/changelog.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";

export function useChangelog() {
  return useQuery({
    queryKey: QUERY_KEYS.changelog,
    queryFn: getChangelog,
    staleTime: STALE_TIME,
  });
}

export function useAdminChangelog() {
  return useQuery({
    queryKey: QUERY_KEYS.adminChangelog,
    queryFn: getAdminChangelog,
    staleTime: STALE_TIME,
  });
}

export function useCreateChangelogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChangelogEntryPayload) => createAdminChangelogEntry(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminChangelog });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.changelog });
    },
  });
}

export function useUpdateChangelogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateChangelogEntryPayload) => updateAdminChangelogEntry(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminChangelog });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.changelog });
    },
  });
}

export function useDeleteChangelogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminChangelogEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminChangelog });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.changelog });
    },
  });
}
