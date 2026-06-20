import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRides, createRide, claimSeat, leaveSeat } from "../services/rides.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CreateRideRequest, ClaimSeatRequest, Direction } from "../types";

export function useRides(direction?: Direction) {
  return useQuery({
    queryKey: direction ? [...QUERY_KEYS.rides, direction] : QUERY_KEYS.rides,
    queryFn: () => getRides(direction),
    staleTime: STALE_TIME,
  });
}

export function useCreateRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRideRequest) => createRide(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}

export function useClaimSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowNumber,
      payload,
    }: {
      rowNumber: number;
      payload: ClaimSeatRequest;
    }) => claimSeat(rowNumber, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}

export function useLeaveSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowNumber,
      payload,
    }: {
      rowNumber: number;
      payload: ClaimSeatRequest;
    }) => leaveSeat(rowNumber, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}
