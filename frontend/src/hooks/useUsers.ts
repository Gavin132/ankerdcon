import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPublicUserNames,
  getUser,
  getUsers, // <-- THIS is the missing piece!
  pingLocation,
  updatePreferences,
} from "../services/users.service";
import { STALE_TIME } from "../constants"; 
import type { LocationPingRequest, UpdatePreferencesRequest } from "../types";

export function usePublicUserNames() {
  return useQuery({
    queryKey: ["userNames"],
    queryFn: getPublicUserNames,
    staleTime: STALE_TIME,
  });
}

// For fetching one specific person safely
export function useUser(name: string) {
  return useQuery({
    queryKey: ["user", name], 
    queryFn: () => getUser(name),
    enabled: !!name, 
    staleTime: STALE_TIME,
  });
}

// For fetching the public, scrubbed list of everyone (for Hub, Transport, MorePage)
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    staleTime: STALE_TIME,
  });
}

export function usePingLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LocationPingRequest) => pingLocation(payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["user", variables.user_name] });
    },
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePreferencesRequest) => updatePreferences(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}