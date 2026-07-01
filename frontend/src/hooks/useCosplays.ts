import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCosplays, createCosplay, deleteCosplay } from "../services/cosplays.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CreateCosplayRequest } from "../types";

export function useCosplays() {
  return useQuery({
    queryKey: QUERY_KEYS.cosplays,
    queryFn: getCosplays,
    staleTime: STALE_TIME,
  });
}

export function useCreateCosplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCosplayRequest) => createCosplay(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.cosplays }),
  });
}

export function useDeleteCosplay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCosplay(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.cosplays }),
  });
}
