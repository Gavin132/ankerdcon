/**
 * Frontend route constants — no magic strings in navigate() or <Navigate>.
 * Use `.pattern` variants for react-router `path` props.
 */
export const routes = {
  hub:        "/",
  login:      "/login",
  onboarding: "/onboarding",
  transport: "/transport",
  food:      "/food",
  finance:   "/finance",
  more:      "/more",
  members:   "/members",

  profile: {
    /** Build the URL for a user profile page. Name is URI-encoded automatically. */
    view:    (name: string) => `/profile/${encodeURIComponent(name)}`,
    pattern: "/profile/:name",
  },

  event: {
    view:    (id: string) => `/events/${id}`,
    pattern: "/events/:id",
  },

  eventHotel: {
    view:    (id: string) => `/events/${id}/hotel`,
    pattern: "/events/:id/hotel",
  },

  eventCosplays: {
    view:    (id: string) => `/events/${id}/cosplays`,
    pattern: "/events/:id/cosplays",
  },

  meal: {
    view:    (id: string) => `/meals/${id}`,
    pattern: "/meals/:id",
  },

  ride: {
    view:    (id: string) => `/rides/${id}`,
    pattern: "/rides/:id",
  },

  admin: {
    base:        "/admin",
    users:       "/admin/users",
    rides:       "/admin/rides",
    meals:       "/admin/meals",
    events:      "/admin/events",
    eventGroups: "/admin/event-groups",
    badges:      "/admin/badges",
  },
} as const;
