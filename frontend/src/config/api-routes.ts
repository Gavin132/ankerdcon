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
    names:       "/api/users/names",
    preferences: "/api/users/preferences",
    name:        "/api/users/name",
    banner:      "/api/users/banner",
    byId:        (identifier: string) => `/api/users/${identifier}`,
    location:    (identifier: string) => `/api/users/${identifier}/location`,
  },
} as const;
