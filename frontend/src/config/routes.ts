/**
 * Frontend route constants — no magic strings in navigate() or <Navigate>.
 * Use `.pattern` variants for react-router `path` props.
 */
export const routes = {
  hub:       "/",
  login:     "/login",
  transport: "/transport",
  food:      "/food",
  finance:   "/finance",
  more:      "/more",

  profile: {
    /** Build the URL for a user profile page. Name is URI-encoded automatically. */
    view:    (name: string) => `/profile/${encodeURIComponent(name)}`,
    pattern: "/profile/:name",
  },
} as const;
