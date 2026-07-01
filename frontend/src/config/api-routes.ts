/**
 * Backend API route constants — no magic strings in API calls.
 * All identifiers must be pre-encoded at the call site (encodeURIComponent).
 */
export const apiRoutes = {
  // ── Rides ───────────────────────────────────────────────────────
  rides: {
    base:                     "/api/rides/",
    claim:                    (id: string | number) => `/api/rides/${id}/claim`,
    leave:                    (id: string | number) => `/api/rides/${id}/leave`,
    restaurantDriver:         (id: string | number) => `/api/rides/${id}/restaurant-driver`,
    restaurantDriverLeave:    (id: string | number) => `/api/rides/${id}/restaurant-driver/leave`,
    restaurantDriverAssign:   (id: string | number) => `/api/rides/${id}/restaurant-driver/assign`,
    restaurantDriverUnassign: (id: string | number) => `/api/rides/${id}/restaurant-driver/unassign`,
  },

  // ── Cosplays ─────────────────────────────────────────────────────
  cosplays: {
    base:  "/api/cosplays/",
    byId:  (id: string) => `/api/cosplays/${id}`,
  },

  // ── Meals ────────────────────────────────────────────────────────
  meals: {
    base:       "/api/meals/",
    byId:       (id: string) => `/api/meals/${id}`,
    rsvp:       (id: string) => `/api/meals/${id}/rsvp`,
    cancelRsvp: (id: string) => `/api/meals/${id}/cancel-rsvp`,
  },

  // ── Payments ─────────────────────────────────────────────────────
  payments: {
    base: "/api/payments/",
    byId: (id: string) => `/api/payments/${id}`,
  },

  // ── Expenses ──────────────────────────────────────────────────────
  expenses: {
    base:         "/api/expenses/",
    byId:         (id: string) => `/api/expenses/${id}`,
    claimShare:   (shareId: string) => `/api/expenses/shares/${shareId}/claim`,
    confirmShare: (shareId: string) => `/api/expenses/shares/${shareId}/confirm`,
  },

  // ── Calendar ─────────────────────────────────────────────────────
  calendar: {
    base:         "/api/calendar/",
    rsvp:         (id: string) => `/api/calendar/${id}/rsvp`,
    leave:        (id: string) => `/api/calendar/${id}/leave`,
    hotelRooms:   (eventId: string) => `/api/calendar/${eventId}/hotel-rooms`,
    assignRoom:   (eventId: string, roomId: string) => `/api/calendar/${eventId}/hotel-rooms/${roomId}/assign`,
    leaveRoom:    (eventId: string, roomId: string) => `/api/calendar/${eventId}/hotel-rooms/${roomId}/leave`,
  },

  // ── Users ────────────────────────────────────────────────────────
  users: {
    base:        "/api/users/",
    me:          "/api/users/me",
    onboarding:  "/api/users/me/onboarding",
    names:       "/api/users/names",
    preferences: "/api/users/preferences",
    name:        "/api/users/name",
    banner:      "/api/users/banner",
    byId:        (identifier: string) => `/api/users/${identifier}`,
    location:    (identifier: string) => `/api/users/${identifier}/location`,
  },

  // ── Badges ────────────────────────────────────────────────────────
  badges: {
    base: "/api/badges/",
  },

  // ── Admin ─────────────────────────────────────────────────────────
  admin: {
    stats: "/api/admin/stats",

    users: {
      base:             "/api/admin/users",
      byId:             (id: string) => `/api/admin/users/${id}`,
      bulkDelete:       "/api/admin/users/bulk-delete",
      bulkDeactivate:   "/api/admin/users/bulk-deactivate",
    },

    rides: {
      base:        "/api/admin/rides",
      byId:        (id: string) => `/api/admin/rides/${id}`,
      passenger:   (id: string, p: string) => `/api/admin/rides/${id}/passengers/${encodeURIComponent(p)}`,
      bulkDelete:  "/api/admin/rides/bulk-delete",
    },

    meals: {
      base:        "/api/admin/meals",
      byId:        (id: string) => `/api/admin/meals/${id}`,
      participant: (id: string, p: string) => `/api/admin/meals/${id}/participants/${encodeURIComponent(p)}`,
      bulkDelete:  "/api/admin/meals/bulk-delete",
    },

    calendar: {
      base:         "/api/admin/calendar",
      byId:         (id: string) => `/api/admin/calendar/${id}`,
      group:        (id: string) => `/api/admin/calendar/${id}/group`,
      participant:  (id: string, p: string) => `/api/admin/calendar/${id}/participants/${encodeURIComponent(p)}`,
      bulkDelete:   "/api/admin/calendar/bulk-delete",
      bulkGroup:    "/api/admin/calendar/bulk-group",
      bulkSetGroup: "/api/admin/calendar/bulk-set-group",
      syncGroup:    (id: string) => `/api/admin/calendar/${id}/sync-group`,
      hotelRooms:   (eventId: string) => `/api/admin/calendar/${eventId}/hotel-rooms`,
      hotelRoomById:(eventId: string, roomId: string) => `/api/admin/calendar/${eventId}/hotel-rooms/${roomId}`,
    },

    eventGroups: {
      base:       "/api/admin/event-groups",
      byId:       (id: string) => `/api/admin/event-groups/${id}`,
      bulkDelete: "/api/admin/event-groups/bulk-delete",
    },

    badges: {
      base:         "/api/admin/badges",
      byId:         (id: string) => `/api/admin/badges/${id}`,
      reorder:      "/api/admin/badges/reorder",
      assignUser:   (userId: string, badgeId: string) => `/api/admin/users/${userId}/badges/${badgeId}`,
      unassignUser: (userId: string, badgeId: string) => `/api/admin/users/${userId}/badges/${badgeId}`,
    },
  },
} as const;
