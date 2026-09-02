import { create } from "zustand";
// IMPORTANT: Import your Supabase client here! Adjust the path as needed.
import { supabase } from "../services/supabase";

function parseJwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const IMPERSONATION_KEY = "ankerd_impersonation";

interface ImpersonationRecord {
  token: string;
  name: string;
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
  // Add the new refresh function to the interface
  refreshAccessToken: () => Promise<string | null>;
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
    set({ accessToken: null, currentUser: null, isAuthenticated: false, forbidden: false });
    // Optional: Force a redirect to login here if you want
    window.location.href = '/login';
  },

  // The Supabase-powered refresh function
  refreshAccessToken: async () => {
    try {
      // Supabase handles the actual refresh logic under the hood
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        throw error || new Error("No session returned");
      }

      const newToken = data.session.access_token;

      // Use your existing setter to update everything cleanly
      get().setAccessToken(newToken);

      return newToken;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      get().clearAuth(); // Kick them out if the refresh token is also dead
      return null;
    }
  },

  startImpersonation: (token, name) => {
    try {
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify({ token, name }));
    } catch {
      // sessionStorage unavailable — impersonation just won't survive a reload
    }
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
    // The real Supabase session was never touched, so a reload lets AuthSync
    // pick it back up on its own.
    window.location.href = "/";
  },
}));
