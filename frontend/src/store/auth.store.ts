import { create } from "zustand";
// IMPORTANT: Import your Supabase client here! Adjust the path as needed.
import { supabase } from "../services/supabase";
import { routes } from "../config/routes";
import { clearPersistedQueries } from "../lib/queryPersist";

function parseJwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const IMPERSONATION_KEY = "ankerd_impersonation";

// Discord OAuth is a full-page redirect away from the app and back, so a
// deep-linked path (e.g. /events/{id}) that a not-yet-logged-in user landed
// on can't survive it via React Router state — that only lives in memory
// and is gone once the browser navigates away. sessionStorage does survive
// the round trip, so LoginForm stashes the intended destination here right
// before starting the OAuth flow, and AuthSync in App.tsx consumes it once
// the session comes back.
export const PENDING_LOGIN_REDIRECT_KEY = "ankerd_pending_login_redirect";

// Same full-page-redirect problem as above, but for linking a Discord
// identity onto an already-signed-in (Google) account — set right before
// supabase.auth.linkIdentity() sends the browser to Discord and back, so
// AuthSync knows to sync the newly-linked identity onto the profile once
// the session settles again.
export const PENDING_DISCORD_LINK_KEY = "ankerd_pending_discord_link";

interface ImpersonationRecord {
  token: string;
  name: string;
}

export type RefreshOutcome = { token: string } | { retry: true } | { dead: true };

/**
 * Whether a failed refresh says "the network was in the way" rather than "this
 * session is over". Supabase tags its own fetch failures as
 * `AuthRetryableFetchError`; a bare `TypeError: Failed to fetch` (offline) and
 * a 5xx from the auth server mean the same thing. Everything else — a 400 with
 * `invalid_grant`, a revoked or reused refresh token — is a genuine sign-out.
 *
 * This matters most on a phone at an event: the app resumes on bad reception,
 * the refresh call fails, and treating that as a dead session logs someone out
 * of an app they were using seconds earlier.
 */
function isTransientAuthError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!error || typeof error !== "object") return false;
  const { name, status, message } = error as { name?: string; status?: number; message?: string };
  if (name === "AuthRetryableFetchError") return true;
  if (name === "TypeError" && /fetch|network/i.test(message ?? "")) return true;
  if (typeof status === "number" && (status === 0 || status === 408 || status === 429 || status >= 500)) return true;
  return false;
}

// sessionStorage (not localStorage) — impersonation should not silently
// survive into a brand new tab/window, only reloads of this one.
function loadImpersonation(): ImpersonationRecord | null {
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  currentUser: string | null;
  isAuthenticated: boolean;
  forbidden: boolean;
  initializing: boolean;
  /** Display name of the profile currently being impersonated, or null. */
  impersonating: string | null;
  setAccessToken: (token: string | null) => void;
  setForbidden: () => void;
  setInitialized: () => void;
  clearAuth: () => void;
  /**
   * Trades the refresh token for a fresh access token.
   * - `{ token }`      — refreshed, carry on.
   * - `{ retry: true }` — couldn't reach Supabase (no reception, radio still
   *   waking up, server blip). The session is untouched and is worth trying
   *   again; the caller must NOT sign the user out.
   * - `{ dead: true }`  — the refresh token itself was rejected. Signed out.
   */
  refreshAccessToken: () => Promise<RefreshOutcome>;
  /** Admin-only: swap the session to a minted token for another profile. */
  startImpersonation: (token: string, name: string) => void;
  /** Drop the impersonated session and restore the real admin session. */
  stopImpersonation: () => void;
}

const _impersonation = loadImpersonation();

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: _impersonation?.token ?? null,
  currentUser: _impersonation ? parseJwtSub(_impersonation.token) : null,
  isAuthenticated: !!_impersonation,
  forbidden: false,
  initializing: !_impersonation,
  impersonating: _impersonation?.name ?? null,

  setAccessToken: (token) =>
    token
      ? set({ accessToken: token, currentUser: parseJwtSub(token), isAuthenticated: true, forbidden: false })
      : set({ accessToken: null, currentUser: null, isAuthenticated: false }),

  setForbidden: () => set({ forbidden: true }),

  setInitialized: () => set({ initializing: false }),

  clearAuth: () => {
    set({ accessToken: null, currentUser: null, isAuthenticated: false, forbidden: false, impersonating: null });
    // Logging out while "logged in as" someone else must end that too:
    // otherwise the reload below restores the minted token from
    // sessionStorage and the next person on this device is that member.
    try {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    } catch {
      // sessionStorage unavailable — nothing stored to remove
    }
    // The persisted query cache holds this account's data; the next person to
    // sign in on this device must not see it flash past before their own loads.
    clearPersistedQueries();
    // Hard redirect (not an in-app navigate) so every query/component
    // remounts fresh with the cleared session — but only when we're not
    // already there. Without this guard, a session that keeps failing to
    // refresh (e.g. a genuinely dead refresh token) reloads this same page,
    // which re-runs the same failing refresh on mount, which calls
    // clearAuth() again — an infinite reload loop instead of just landing
    // on a stable "you're logged out" screen.
    if (window.location.pathname !== routes.login) {
      window.location.href = routes.login;
    }
  },

  // The Supabase-powered refresh function
  refreshAccessToken: async () => {
    // A minted "log in as" token can't be refreshed. Refreshing would hand
    // back the admin's own session while the banner still names the member,
    // so changes would quietly be saved as the admin. End it instead.
    if (get().impersonating) {
      get().stopImpersonation();
      return { dead: true };
    }
    try {
      // Supabase handles the actual refresh logic under the hood
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        throw error || new Error("No session returned");
      }

      const newToken = data.session.access_token;

      // Use your existing setter to update everything cleanly
      get().setAccessToken(newToken);

      return { token: newToken };
    } catch (error) {
      if (isTransientAuthError(error)) {
        // Keep the session: the refresh token is probably still perfectly
        // good, we just couldn't reach the server to spend it.
        console.warn("Token refresh failed, keeping the session:", error);
        return { retry: true };
      }
      console.error("Failed to refresh token:", error);
      get().clearAuth(); // Kick them out if the refresh token is also dead
      return { dead: true };
    }
  },

  startImpersonation: (token, name) => {
    try {
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify({ token, name }));
    } catch {
      // sessionStorage unavailable — impersonation just won't survive a reload
    }
    // The restored cache belongs to the admin's own account; without this the
    // impersonated session would open on their data.
    clearPersistedQueries();
    // Hard reload: guarantees every query/component picks up the new
    // identity fresh, rather than trying to invalidate everything by hand.
    window.location.href = "/";
  },

  stopImpersonation: () => {
    try {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    } catch {
      // ignore
    }
    clearPersistedQueries();
    // The real Supabase session was never touched, so a reload lets AuthSync
    // pick it back up on its own.
    window.location.href = "/";
  },
}));
