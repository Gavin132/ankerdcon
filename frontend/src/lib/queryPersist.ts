import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Query } from "@tanstack/react-query";

/**
 * Where the last known server data is kept between visits. Reading it back on
 * startup is what lets the app paint real content immediately — on a phone at
 * an event the first request can take seconds, or never arrive at all.
 */
export const QUERY_CACHE_KEY = "ankerd_query_cache";

/** Older than this and we'd rather show a loading state than a stale one. */
export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export const queryPersister = createSyncStoragePersister({
  storage: typeof window === "undefined" ? undefined : window.localStorage,
  key: QUERY_CACHE_KEY,
  // Writing the whole cache is not free, and mutations can land in bursts.
  throttleTime: 2000,
  // A full cache can outgrow the ~5 MB localStorage budget; dropping the
  // oldest entries beats throwing and persisting nothing at all.
  retry: ({ persistedClient, error }) => {
    if (error) return undefined;
    const queries = persistedClient.clientState.queries.slice(1);
    return queries.length === 0 ? undefined : { ...persistedClient, clientState: { ...persistedClient.clientState, queries } };
  },
});

/**
 * Admin screens pull whole tables that no one needs on startup, and the
 * story-seen markers are per-visit bookkeeping — neither is worth the space or
 * the risk of showing something outdated.
 */
export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== "success") return false;
  const key = query.queryKey;
  return !(Array.isArray(key) && (key[0] === "admin" || key[2] === "seen"));
}

/** Drops the cache, so the next person to sign in on this device starts clean. */
export function clearPersistedQueries(): void {
  try {
    window.localStorage.removeItem(QUERY_CACHE_KEY);
  } catch {
    // localStorage unavailable (private mode, blocked site data) — nothing to clear
  }
}
