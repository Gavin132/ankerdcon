import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRides, createRide, claimSeat, leaveSeat, addRestaurantDriver, leaveRestaurantDriver, assignToDriver, unassignFromDriver } from "../services/rides.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { Ride, CreateRideRequest, ClaimSeatRequest, Direction, RestaurantDriverRequest, LeaveRestaurantDriverRequest, RestaurantAssignRequest, RestaurantUnassignRequest } from "../types";

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
    mutationFn: ({ id, payload }: { id: string; payload: ClaimSeatRequest }) =>
      claimSeat(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.rides });
      // Snapshot all cached ride lists (base key + any direction-filtered keys)
      const previous = qc.getQueriesData<Ride[]>({ queryKey: QUERY_KEYS.rides });
      qc.setQueriesData<Ride[]>({ queryKey: QUERY_KEYS.rides }, (old) =>
        old?.map((r) =>
          r.id === id && !r.passengers.includes(payload.user_name)
            ? { ...r, passengers: [...r.passengers, payload.user_name] }
            : r,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([queryKey, data]) =>
        qc.setQueryData(queryKey, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}

export function useLeaveSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClaimSeatRequest }) =>
      leaveSeat(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.rides });
      const previous = qc.getQueriesData<Ride[]>({ queryKey: QUERY_KEYS.rides });
      qc.setQueriesData<Ride[]>({ queryKey: QUERY_KEYS.rides }, (old) =>
        old?.map((r) =>
          r.id === id
            ? { ...r, passengers: r.passengers.filter((p) => p !== payload.user_name) }
            : r,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([queryKey, data]) =>
        qc.setQueryData(queryKey, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}

export function useAddRestaurantDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RestaurantDriverRequest }) =>
      addRestaurantDriver(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}

export function useLeaveRestaurantDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LeaveRestaurantDriverRequest }) =>
      leaveRestaurantDriver(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}

export function useAssignToDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RestaurantAssignRequest }) =>
      assignToDriver(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}

export function useUnassignFromDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RestaurantUnassignRequest }) =>
      unassignFromDriver(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rides }),
  });
}
