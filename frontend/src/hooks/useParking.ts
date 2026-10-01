import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getParkingSpots, setParkingSpot, deleteParkingSpot } from "../services/parking.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { SetParkingSpotRequest } from "../types";

export function useParkingSpots(tripId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.parking(tripId ?? ""),
    queryFn: () => getParkingSpots(tripId!),
    enabled: !!tripId,
    staleTime: STALE_TIME,
  });
}

export function useSetParkingSpot(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetParkingSpotRequest) => setParkingSpot(tripId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.parking(tripId) }),
  });
}

export function useDeleteParkingSpot(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (driver: string) => deleteParkingSpot(tripId, driver),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.parking(tripId) }),
  });
}
