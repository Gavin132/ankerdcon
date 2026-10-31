import { apiClient } from "../../lib/api/client";
import { QUERY_CACHE_KEY } from "../../lib/queryPersist";
import { setMockMode } from "../../lib/mockMode";
import { useAuthStore } from "../../store/auth.store";
import { makeAdapter, unhandled } from "./adapter";
import { buildFixtures, type Role, type Scenario } from "./fixtures";

const KEY = "ankerd_mock";

export interface MockOptions {
  /** Where the main trip stands: coming up, on right now, or over. */
  scenario: Scenario;
  /** Who is signed in. */
  role: Role;
  /** Milliseconds every answer is held back, to see loading states. */
  delay: number;
}

/**
 * Reads the options from the address (`/?mock&scenario=live&role=admin&delay=800`), else from what this tab
 * remembered, else the defaults.
 */
function readOptions(): MockOptions {
  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Partial<MockOptions>;
    } catch {
      return {};
    }
  })();
  const q = new URLSearchParams(window.location.search);
  const pick = <T extends string>(name: string, allowed: readonly T[], fallback: T): T => {
    const v = q.get(name) ?? (saved as Record<string, string | undefined>)[name];
    return allowed.includes(v as T) ? (v as T) : fallback;
  };
  return {
    scenario: pick("scenario", ["upcoming", "live", "past"] as const, "upcoming"),
    role: pick("role", ["member", "admin", "viewer"] as const, "member"),
    delay: Number(q.get("delay") ?? saved.delay ?? 0) || 0,
  };
}

/**
 * Turns the running app into a demo of itself: signed in as a made-up member, every request answered from
 * made-up data. For looking at screens (and for the automatic checks in `scripts/mobile-audit.mjs`), never for
 * real use: it only exists in development builds, and nothing it does reaches the server.
 */
export function installMock(): MockOptions {
  const options = readOptions();
  try {
    sessionStorage.setItem(KEY, JSON.stringify(options));
    // Whatever a real session left in the saved cache must not show up as if it were this data.
    localStorage.removeItem(QUERY_CACHE_KEY);
  } catch {
    // Storage blocked: mock mode still works for this load, it just will not outlast a reload.
  }

  const fx = buildFixtures(options.scenario, options.role);
  setMockMode(true);
  apiClient.defaults.adapter = makeAdapter(fx, options.delay);
  useAuthStore.setState({
    accessToken: "mock-token", currentUser: fx.me.id ?? null, isAuthenticated: true, forbidden: false, initializing: false, impersonating: null,
  });

  (window as unknown as { __mock: unknown }).__mock = { options, fixtures: fx, unhandled };
  void import("../audit");
  return options;
}
