import { create } from "zustand";

function parseJwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  currentUser: string | null;
  isAuthenticated: boolean;
  forbidden: boolean;
  setAccessToken: (token: string | null) => void;
  setForbidden: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  currentUser: null,
  isAuthenticated: false,
  forbidden: false,
  setAccessToken: (token) =>
    token
      ? set({ accessToken: token, currentUser: parseJwtSub(token), isAuthenticated: true, forbidden: false })
      : set({ accessToken: null, currentUser: null, isAuthenticated: false }),
  setForbidden: () => set({ forbidden: true }),
  clearAuth: () =>
    set({ accessToken: null, currentUser: null, isAuthenticated: false, forbidden: false }),
}));
