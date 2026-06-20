import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, pingLocation } from "../services/users.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { LocationPingRequest } from "../types";

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
