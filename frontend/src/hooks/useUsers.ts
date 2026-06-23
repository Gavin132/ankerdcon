import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPublicUserNames,
  getUsers,
  pingLocation,
  updatePreferences,
} from "../services/users.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { LocationPingRequest, UpdatePreferencesRequest } from "../types";

export function usePublicUserNames() {
  return useQuery({
    queryKey: ["userNames"],
    queryFn: getPublicUserNames,
    staleTime: STALE_TIME,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: getUsers,
    staleTime: STALE_TIME,
  });
}

export function usePingLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LocationPingRequest) => pingLocation(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.users }),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePreferencesRequest) => updatePreferences(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.users }),
  });
}
