import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { router } from "./router";
import { ToastContainer } from "./components/common/Toast";
import { SplashScreen } from "./components/splash/SplashScreen";
import { useThemeStore } from "./store/theme.store";
import { useSplash } from "./hooks/useSplash";

// Add these two imports!
import { supabase } from "./services/supabase";
import { useAuthStore } from "./store/auth.store";
import { ApiError } from "./lib/api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on 401 — the axios interceptor already handles token refresh + one retry.
      // Retrying 401s here would just flood the backend with bad requests.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.isUnauthorized) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 8000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 30_000,
      gcTime: 5 * 60_000, // keep cached data for 5 min so tab switches are instant
    },
  },
});

function ThemeSync() {
  const isDark = useThemeStore((s) => s.isDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);
  return null;
}

// Watches for Supabase auth state changes (Discord redirect, token refresh, sign-out).
// Uses onAuthStateChange exclusively for initialization to avoid a race condition where
// getSession() resolves before the OAuth hash is processed, returning null and causing
// a spurious redirect to /login right after the Discord callback.
function AuthSync() {
  const setAccessToken  = useAuthStore((s) => s.setAccessToken);
  const setInitialized  = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setAccessToken(session.access_token);
      } else {
        setAccessToken(null);
      }
      // INITIAL_SESSION fires once on subscription, after Supabase has processed
      // any OAuth hash/PKCE code in the URL — safe to mark as initialized here.
      if (event === 'INITIAL_SESSION') {
        setInitialized();
      }
    });

    return () => subscription.unsubscribe();
  }, [setAccessToken, setInitialized]);

  return null;
}

function SplashController() {
  const { visible, dismiss } = useSplash();
  return (
    <AnimatePresence>
      {visible && <SplashScreen key="splash" onDismiss={dismiss} />}
    </AnimatePresence>
  );
}

function AppBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {/* Mascot — large, bottom-right, partially clipped */}
      <img
        src="/assets/images/ankerd-mascotte.svg"
        alt=""
        draggable={false}
        className="absolute -bottom-12 -right-12 w-[380px] select-none opacity-[0.045] dark:opacity-[0.055]"
        style={{ transform: "rotate(6deg)" }}
      />
      {/* Nerd logo — smaller, top-left, softly rotated */}
      <img
        src="/assets/images/ankerdmascotteankerdlogountitlednerd.png"
        alt=""
        draggable={false}
        className="absolute -top-10 -left-10 w-[200px] select-none opacity-[0.035] dark:opacity-[0.045]"
        style={{ transform: "rotate(-8deg)" }}
      />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <AuthSync /> {/* <- Dropped it right here! */}
      <AppBackdrop />
      <RouterProvider router={router} />
      <ToastContainer />
      <SplashController />
    </QueryClientProvider>
  );
}