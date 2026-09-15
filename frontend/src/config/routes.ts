import type { TripTabId } from "../utils/trips";

/**
 * Frontend route constants — no magic strings in navigate() or <Navigate>.
 * Use `.pattern` variants for react-router `path` props.
 */
export const routes = {
  hub:        "/",
  login:      "/login",
  onboarding: "/onboarding",
  calendar:   "/calendar",
  finance:    "/finance",
  crew:       "/crew",
  settings:   "/settings",
  notifications: "/settings/notifications",
  changelog:  "/settings/changelog",
  /** Deliberately throws on render, to test `ErrorBoundary`'s fallback screen. */
  testError: "/test-error",

  /** Financiën with one expense's detail drawer already open. */
  expense: {
    view: (id: string) => `/finance?expense=${encodeURIComponent(id)}`,
  },

  /** Financiën showing only one trip's expenses. */
  tripExpenses: {
    view: (tripId: string) => `/finance?trip=${encodeURIComponent(tripId)}`,
  },

  /**
   * The Event tab. Resolves to whichever trip is current and reopens the
   * sub-tab used last, unless a specific `tab` is asked for.
   */
  currentTrip: {
    base:    "/trip",
    tab:     (tab: TripTabId) => `/trip/${tab}`,
    pattern: "/trip/:tab?",
  },

  /**
   * One trip: every day of a multi-day event (by `multi_day_id`), or a
   * single event day (by its id). `day` preselects one day of the trip.
   */
  trip: {
    view: (tripId: string, tab: TripTabId = "overview", day?: string) =>
      `/trips/${encodeURIComponent(tripId)}${tab === "overview" ? "" : `/${tab}`}${day ? `?day=${encodeURIComponent(day)}` : ""}`,
    pattern: "/trips/:tripId",
  },

  profile: {
    /** Build the URL for a user profile page. The id is URI-encoded automatically. */
    view:    (userId: string) => `/profile/${encodeURIComponent(userId)}`,
    pattern: "/profile/:userId",
  },

  /** A single event day. Redirects to that day on its trip's Overzicht tab. */
  event: {
    view:    (id: string) => `/events/${id}`,
    pattern: "/events/:id",
  },

  meal: {
    view:    (id: string) => `/meals/${id}`,
    pattern: "/meals/:id",
  },

  ride: {
    view:    (id: string) => `/rides/${id}`,
    pattern: "/rides/:id",
  },

  /**
   * Paths from before the navigation rework. Each one only redirects to its
   * new home, so bookmarks, shared links and Discord messages keep working.
   */
  legacy: {
    transport:     "/transport",
    food:          "/food",
    more:          "/more",
    members:       "/members",
    acties:        "/acties",
    notifications: "/notifications",
    changelog:     "/changelog",
    stories:       "/stories",
    eventHotel:    "/events/:id/hotel",
    eventCosplays: "/events/:id/cosplays",
  },

  admin: {
    base:              "/admin",
    users:             "/admin/users",
    rides:             "/admin/rides",
    meals:             "/admin/meals",
    events:            "/admin/events",
    eventGroups:       "/admin/event-groups",
    badges:            "/admin/badges",
    whitelist:         "/admin/whitelist",
    betalingen:        "/admin/betalingen",
    announcements:     "/admin/announcements",
    changelog:         "/admin/changelog",
    previewOnboarding: "/admin/preview/onboarding",
    impersonate:       "/admin/impersonate",
    timeTravel:        "/admin/time-travel",
  },
} as const;
