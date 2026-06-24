import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMeals, createMeal, rsvpMeal, cancelRsvp, deleteMeal } from "../services/meals.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CreateMealRequest, RsvpRequest } from "../types";

export function useMeals() {
  return useQuery({
    queryKey: QUERY_KEYS.meals,
    queryFn: getMeals,
    staleTime: STALE_TIME,
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMealRequest) => createMeal(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.meals }),
  });
}

export function useRsvpMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RsvpRequest }) =>
      rsvpMeal(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.meals }),
  });
}

export function useCancelRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RsvpRequest }) =>
      cancelRsvp(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.meals }),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMeal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.meals }),
  });
}
