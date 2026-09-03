import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAdminWhitelistEntry,
  deleteAdminWhitelistEntry,
  getAdminWhitelist,
} from "../services/whitelist.service";
import type { CreateWhitelistEntryPayload } from "../services/whitelist.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";

export function useAdminWhitelist() {
  return useQuery({
    queryKey: QUERY_KEYS.adminWhitelist,
    queryFn: getAdminWhitelist,
    staleTime: STALE_TIME,
  });
}

export function useCreateWhitelistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWhitelistEntryPayload) => createAdminWhitelistEntry(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.adminWhitelist }),
  });
}

export function useDeleteWhitelistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminWhitelistEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.adminWhitelist }),
  });
}
