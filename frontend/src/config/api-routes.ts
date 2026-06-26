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

  // ── Calendar ─────────────────────────────────────────────────────
  calendar: {
    base:  "/api/calendar/",
    rsvp:  (id: string) => `/api/calendar/${id}/rsvp`,
    leave: (id: string) => `/api/calendar/${id}/leave`,
  },

  // ── Users ────────────────────────────────────────────────────────
  users: {
    base:        "/api/users/",
    me:          "/api/users/me",
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
      base: "/api/admin/users",
      byId: (id: string) => `/api/admin/users/${id}`,
    },

    rides: {
      base:      "/api/admin/rides",
      byId:      (id: string) => `/api/admin/rides/${id}`,
      passenger: (id: string, p: string) => `/api/admin/rides/${id}/passengers/${encodeURIComponent(p)}`,
    },

    meals: {
      base:        "/api/admin/meals",
      byId:        (id: string) => `/api/admin/meals/${id}`,
      participant: (id: string, p: string) => `/api/admin/meals/${id}/participants/${encodeURIComponent(p)}`,
    },

    calendar: {
      base:        "/api/admin/calendar",
      byId:        (id: string) => `/api/admin/calendar/${id}`,
      participant: (id: string, p: string) => `/api/admin/calendar/${id}/participants/${encodeURIComponent(p)}`,
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
