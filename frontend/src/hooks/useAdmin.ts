import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../constants";
import {
  bulkDeleteAdminEvents,
  bulkRsvpAdminEvent,
  bulkDeleteAdminUsers,
  bulkDeactivateAdminUsers,
  bulkDeleteAdminRides,
  bulkDeleteAdminMeals,
  bulkDeleteAdminEventGroups,
  createAdminMealCategory,
  deleteAdminMealCategory,
  getAdminMealCategories,
  updateAdminMealCategory,
  bulkSetAdminEventGroup,
  createAdminEvent,
  createAdminEventDay,
  createAdminEventGroup,
  createAdminMeal,
  createAdminRide,
  createAdminUser,
  deleteAdminEvent,
  deleteAdminEventDay,
  deleteAdminEventGroup,
  deleteAdminMeal,
  deleteAdminRide,
  deleteAdminUser,
  getAdminEventGroups,
  getAdminEvents,
  getAdminEventDays,
  getAdminMeals,
  getAdminRides,
  getAdminStats,
  getAdminUsers,
  removeAdminEventParticipant,
  removeAdminMealParticipant,
  removeAdminPassenger,
  updateAdminEvent,
  updateAdminEventDay,
  updateAdminEventGroup,
  updateAdminMeal,
  updateAdminRide,
  updateAdminUser,
  adminDeleteHotelRoom,
  updateAdminExpense,
  deleteAdminExpense,
  setAdminShareStatus,
  impersonateAdminUser,
  mergeAdminUser,
  type AdminCreateEventPayload,
  type AdminCreateEventDayPayload,
  type AdminCreateMealPayload,
  type AdminCreateUserPayload,
  type AdminUpdateEventPayload,
  type AdminUpdateMealPayload,
  type AdminUpdateRidePayload,
  type AdminUpdateUserPayload,
} from "../services/admin.service";
import type { CreateRideRequest, ExpenseShare } from "../types";

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

export function useAdminEventDays() {
  return useQuery({ queryKey: QUERY_KEYS.adminEventDays, queryFn: getAdminEventDays });
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

/** What merging this placeholder into that member would move. Always asked fresh: the answer is only true now. */
export function useAdminMergePreview(sourceId: string | undefined, targetId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminMergePreview(sourceId ?? "", targetId ?? ""),
    queryFn: () => mergeAdminUser(sourceId!, targetId!, true),
    enabled: !!sourceId && !!targetId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

/** Merges a placeholder into a member. Whatever the placeholder was on changes name, so everything that shows names is refetched. */
export function useAdminMergeUser() {
  const qc = useQueryClient();
  const refresh = () => {
    for (const queryKey of [
      QUERY_KEYS.adminUsers, QUERY_KEYS.users, QUERY_KEYS.userNames, QUERY_KEYS.userBase, QUERY_KEYS.currentUser,
      QUERY_KEYS.rides, QUERY_KEYS.rideCosts, QUERY_KEYS.meals, QUERY_KEYS.calendar, QUERY_KEYS.cosplays,
      QUERY_KEYS.expenses, QUERY_KEYS.settlements, QUERY_KEYS.badges,
      QUERY_KEYS.adminRides, QUERY_KEYS.adminMeals, QUERY_KEYS.adminEvents, QUERY_KEYS.adminEventDays, QUERY_KEYS.adminStats,
      ["hotel-rooms"], ["admin", "hotel-rooms"], ["stories"], ["parking"],
    ]) {
      qc.invalidateQueries({ queryKey });
    }
  };
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) => mergeAdminUser(sourceId, targetId, false),
    onSuccess: refresh,
    // Also after a failure: a merge that stopped halfway has already moved some of it.
    onError: refresh,
  });
}

export function useAdminImpersonateUser() {
  return useMutation({
    mutationFn: (id: string) => impersonateAdminUser(id),
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
// Every mutation invalidates both the admin views and the regular
// user-facing calendar list, since both are backed by the same tables.

function invalidateEventQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEvents });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.adminEventDays });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.calendar });
}

export function useAdminCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCreateEventPayload) => createAdminEvent(payload),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateEventPayload) => updateAdminEvent(payload),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminEvent(id),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminBulkDeleteEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventIds: string[]) => bulkDeleteAdminEvents(eventIds),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminBulkSetEventGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventIds, groupId }: { eventIds: string[]; groupId: string | null }) =>
      bulkSetAdminEventGroup(eventIds, groupId),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminCreateEventDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: AdminCreateEventDayPayload }) =>
      createAdminEventDay(eventId, payload),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminUpdateEventDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, payload }: { dayId: string; payload: { date?: string; has_con?: boolean } }) =>
      updateAdminEventDay(dayId, payload),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminDeleteEventDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dayId: string) => deleteAdminEventDay(dayId),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminRemoveEventParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, participant }: { dayId: string; participant: string }) =>
      removeAdminEventParticipant(dayId, participant),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

export function useAdminBulkRsvpEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, userNames }: { dayId: string; userNames: string[] }) =>
      bulkRsvpAdminEvent(dayId, userNames),
    onSuccess: () => invalidateEventQueries(qc),
  });
}

// ── Hotel Room (admin) hooks ──────────────────────────────────────────────────

export function useAdminDeleteHotelRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, roomId }: { eventId: string; roomId: string }) =>
      adminDeleteHotelRoom(eventId, roomId),
    onSuccess: (_d, { eventId }) => {
      qc.invalidateQueries({ queryKey: ["hotel-rooms", eventId] });
      qc.invalidateQueries({ queryKey: ["admin", "hotel-rooms", eventId] });
    },
  });
}

// ── Event group hooks ─────────────────────────────────────────────────────────

function invalidateMealCategories(qc: ReturnType<typeof useQueryClient>) {
  // The members' list and every activity's embedded copy of its category change too.
  qc.invalidateQueries({ queryKey: QUERY_KEYS.adminMealCategories });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.mealCategories });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.meals });
}

export function useAdminMealCategories() {
  return useQuery({ queryKey: QUERY_KEYS.adminMealCategories, queryFn: getAdminMealCategories });
}

export function useAdminCreateMealCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAdminMealCategory,
    onSuccess: () => invalidateMealCategories(qc),
  });
}

export function useAdminUpdateMealCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateAdminMealCategory>[1] }) =>
      updateAdminMealCategory(id, payload),
    onSuccess: () => invalidateMealCategories(qc),
  });
}

export function useAdminDeleteMealCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminMealCategory(id),
    onSuccess: () => invalidateMealCategories(qc),
  });
}

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

// ── Expense mutations ─────────────────────────────────────────────────────────

export function useAdminUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, linkedEventId }: { id: string; linkedEventId: string | null }) =>
      updateAdminExpense(id, linkedEventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
  });
}

export function useAdminDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
  });
}

export function useAdminSetShareStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shareId, status }: { shareId: string; status: ExpenseShare["status"] }) =>
      setAdminShareStatus(shareId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
  });
}
