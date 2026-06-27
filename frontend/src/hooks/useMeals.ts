import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMeals, createMeal, rsvpMeal, cancelRsvp, deleteMeal } from "../services/meals.service";
import { QUERY_KEYS, STALE_TIME } from "../constants";
import type { CreateMealRequest, RsvpRequest, Meal } from "../types";

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
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.meals });
      const previous = qc.getQueryData<Meal[]>(QUERY_KEYS.meals);
      qc.setQueryData<Meal[]>(QUERY_KEYS.meals, (old) =>
        old?.map((m) =>
          m.id === id && !m.participants.includes(payload.user_name)
            ? { ...m, participants: [...m.participants, payload.user_name] }
            : m,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEYS.meals, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.meals }),
  });
}

export function useCancelRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RsvpRequest }) =>
      cancelRsvp(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.meals });
      const previous = qc.getQueryData<Meal[]>(QUERY_KEYS.meals);
      qc.setQueryData<Meal[]>(QUERY_KEYS.meals, (old) =>
        old?.map((m) =>
          m.id === id
            ? { ...m, participants: m.participants.filter((p) => p !== payload.user_name) }
            : m,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(QUERY_KEYS.meals, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.meals }),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMeal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.meals }),
  });
}
