import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRideCosts, setRideCost } from "../services/rideCosts.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";

export function useRideCosts() {
  return useQuery({
    queryKey: QUERY_KEYS.rideCosts,
    queryFn: getRideCosts,
    staleTime: STALE_TIME,
  });
}

export function useSetRideCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, amount }: { tripId: string; amount: number | null }) => setRideCost(tripId, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rideCosts }),
  });
}
