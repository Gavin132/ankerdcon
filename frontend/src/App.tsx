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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
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

// THE NEW FIX: This silently watches for Discord tokens
function AuthSync() {
  const setAccessToken  = useAuthStore((s) => s.setAccessToken);
  const setInitialized  = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    // 1. Restore session on load — always mark initialized when done
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
      setInitialized();
    });

    // 2. Keep token fresh on auth state changes (Discord redirect, token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAccessToken(session.access_token);
      } else {
        setAccessToken(null);
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <AuthSync /> {/* <- Dropped it right here! */}
      <RouterProvider router={router} />
      <ToastContainer />
      <SplashController />
    </QueryClientProvider>
  );
}