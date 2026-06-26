import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import {
  createAdminEvent,
  createAdminMeal,
  createAdminRide,
  deleteAdminEvent,
  deleteAdminMeal,
  deleteAdminRide,
  deleteAdminUser,
  getAdminEvents,
  getAdminMeals,
  getAdminRides,
  getAdminStats,
  getAdminUsers,
  removeAdminEventParticipant,
  removeAdminMealParticipant,
  removeAdminPassenger,
  updateAdminEvent,
  updateAdminMeal,
  updateAdminRide,
  updateAdminUser,
  type AdminCreateEventPayload,
  type AdminCreateMealPayload,
  type AdminUpdateEventPayload,
  type AdminUpdateMealPayload,
  type AdminUpdateRidePayload,
  type AdminUpdateUserPayload,
} from "../services/admin.service";
import type { CreateRideRequest } from "../types";

// ── Queries ───────────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({ queryKey: QUERY_KEYS.adminStats, queryFn: getAdminStats });
}

export function useAdminUsers() {
  return useQuery({ queryKey: QUERY_KEYS.adminUsers, queryFn: getAdminUsers });
}

export function useAdminRides() {
  return useQuery({ queryKey: QUERY_KEYS.adminRides, queryFn: getAdminRides });
}

export function useAdminMeals() {
  return useQuery({ queryKey: QUERY_KEYS.adminMeals, queryFn: getAdminMeals });
}

export function useAdminEvents() {
  return useQuery({ queryKey: QUERY_KEYS.adminEvents, queryFn: getAdminEvents });
}

// ── User mutations ────────────────────────────────────────────────────────────

export function useAdminUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateUserPayload) => updateAdminUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

// ── Ride mutations ────────────────────────────────────────────────────────────

export function useAdminCreateRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRideRequest) => createAdminRide(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminRides });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.rides });
    },
  });
}

export function useAdminUpdateRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateRidePayload) => updateAdminRide(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminRides });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.rides });
    },
  });
}

export function useAdminDeleteRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminRide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminRides });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.rides });
    },
  });
}

export function useAdminRemovePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, passenger }: { rideId: string; passenger: string }) =>
      removeAdminPassenger(rideId, passenger),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminRides });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.rides });
    },
  });
}

// ── Meal mutations ────────────────────────────────────────────────────────────

export function useAdminCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCreateMealPayload) => createAdminMeal(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminMeals });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.meals });
    },
  });
}

export function useAdminUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateMealPayload) => updateAdminMeal(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminMeals });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.meals });
    },
  });
}

export function useAdminDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminMeal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminMeals });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.meals });
    },
  });
}

export function useAdminRemoveMealParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mealId, participant }: { mealId: string; participant: string }) =>
      removeAdminMealParticipant(mealId, participant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminMeals });
    },
  });
}

// ── Event mutations ───────────────────────────────────────────────────────────

export function useAdminCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCreateEventPayload) => createAdminEvent(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar });
    },
  });
}

export function useAdminUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateEventPayload) => updateAdminEvent(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar });
    },
  });
}

export function useAdminDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar });
    },
  });
}

export function useAdminRemoveEventParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, participant }: { eventId: string; participant: string }) =>
      removeAdminEventParticipant(eventId, participant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
    },
  });
}
