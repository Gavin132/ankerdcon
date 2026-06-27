import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import {
  bulkDeleteAdminEvents,
  bulkDeleteAdminUsers,
  bulkDeactivateAdminUsers,
  bulkDeleteAdminRides,
  bulkDeleteAdminMeals,
  bulkDeleteAdminEventGroups,
  bulkGroupAdminEvents,
  bulkSetAdminEventGroup,
  createAdminEvent,
  createAdminEventGroup,
  createAdminMeal,
  createAdminRide,
  createAdminUser,
  deleteAdminEvent,
  deleteAdminEventGroup,
  deleteAdminMeal,
  deleteAdminRide,
  deleteAdminUser,
  getAdminEventGroups,
  getAdminEvents,
  getAdminMeals,
  getAdminRides,
  getAdminStats,
  getAdminUsers,
  removeAdminEventParticipant,
  removeAdminMealParticipant,
  removeAdminPassenger,
  setAdminEventGroup,
  updateAdminEvent,
  updateAdminEventGroup,
  updateAdminMeal,
  updateAdminRide,
  updateAdminUser,
  type AdminCreateEventPayload,
  type AdminCreateMealPayload,
  type AdminCreateUserPayload,
  type AdminUpdateEventPayload,
  type AdminUpdateMealPayload,
  type AdminUpdateRidePayload,
  type AdminUpdateUserPayload,
} from "../services/admin.service";
import type { CalendarEvent, CreateRideRequest } from "../types";

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

export function useAdminCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCreateUserPayload) => createAdminUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

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

export function useAdminBulkDeleteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => bulkDeleteAdminUsers(userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminUsers });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useAdminBulkDeactivateUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => bulkDeactivateAdminUsers(userIds),
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

export function useAdminBulkDeleteRides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rideIds: string[]) => bulkDeleteAdminRides(rideIds),
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

export function useAdminBulkDeleteMeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mealIds: string[]) => bulkDeleteAdminMeals(mealIds),
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

export function useAdminBulkDeleteEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventIds: string[]) => bulkDeleteAdminEvents(eventIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar });
    },
  });
}

export function useAdminBulkGroupEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventIds, multiDayId }: { eventIds: string[]; multiDayId: string | null }) =>
      bulkGroupAdminEvents(eventIds, multiDayId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar });
    },
  });
}

export function useAdminBulkSetEventGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventIds, groupId }: { eventIds: string[]; groupId: string | null }) =>
      bulkSetAdminEventGroup(eventIds, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar });
    },
  });
}

export function useAdminSetEventGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, groupId }: { eventId: string; groupId: string | null }) =>
      setAdminEventGroup(eventId, groupId),
    onMutate: async ({ eventId, groupId }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.adminEvents });
      const previous = qc.getQueryData<CalendarEvent[]>(QUERY_KEYS.adminEvents);
      qc.setQueryData<CalendarEvent[]>(QUERY_KEYS.adminEvents, (old = []) =>
        old.map((ev) => ev.id === eventId ? { ...ev, event_group_id: groupId ?? undefined } : ev),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(QUERY_KEYS.adminEvents, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar });
    },
  });
}

// ── Event group hooks ─────────────────────────────────────────────────────────

export function useAdminEventGroups() {
  return useQuery({ queryKey: QUERY_KEYS.adminEventGroups, queryFn: getAdminEventGroups });
}

export function useAdminCreateEventGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createAdminEventGroup(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEventGroups }),
  });
}

export function useAdminUpdateEventGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateAdminEventGroup(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEventGroups }),
  });
}

export function useAdminDeleteEventGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminEventGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEventGroups }),
  });
}

export function useAdminBulkDeleteEventGroups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupIds: string[]) => bulkDeleteAdminEventGroups(groupIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEventGroups }),
  });
}
