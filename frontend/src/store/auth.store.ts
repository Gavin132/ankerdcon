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

interface AuthState {
  accessToken: string | null;
  currentUser: string | null;
  isAuthenticated: boolean;
  forbidden: boolean;
  initializing: boolean;
  setAccessToken: (token: string | null) => void;
  setForbidden: () => void;
  setInitialized: () => void;
  clearAuth: () => void;
  // Add the new refresh function to the interface
  refreshAccessToken: () => Promise<string | null>; 
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  currentUser: null,
  isAuthenticated: false,
  forbidden: false,
  initializing: true,

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
}));