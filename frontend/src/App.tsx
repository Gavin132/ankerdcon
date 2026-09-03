import { Suspense, useEffect, useRef } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { router } from "./router";
import { ToastContainer } from "./components/common/Toast";
import { SplashScreen } from "./components/splash/SplashScreen";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { TimeTravelWidget } from "./components/common/TimeTravelWidget";
import { ImpersonationBanner } from "./components/common/ImpersonationBanner";
import { useThemeStore } from "./store/theme.store";
import { useTimeStore } from "./store/time.store";
import { useSplash } from "./hooks/useSplash";

// Add these two imports!
import { supabase } from "./services/supabase";
import { useAuthStore, PENDING_LOGIN_REDIRECT_KEY, PENDING_DISCORD_LINK_KEY } from "./store/auth.store";
import { ApiError } from "./lib/api/client";
import { linkDiscordAccount } from "./services/users.service";
import { QUERY_KEYS } from "./constants";
import { toast } from "./store/toast.store";

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

// Matches Header.tsx's actual background: bg-white in light, slate-900 in dark.
const THEME_COLOR_LIGHT = "#ffffff";
const THEME_COLOR_DARK = "#0f172a";

function ThemeSync() {
  const isDark = useThemeStore((s) => s.isDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);

    // Keep the Android status bar / browser toolbar color in sync with the
    // navbar. This tracks the app's actual active theme (including a manual
    // toggle), not just OS preference, so a `media` attribute alone wouldn't
    // be enough — it has to be updated at runtime.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
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
    // While impersonating, the store already has a minted token (restored
    // from sessionStorage at module init) and the real Supabase session is
    // still alive in the background — don't let it clobber the impersonated
    // one. Impersonation only starts/stops via a hard reload, so this flag
    // is stable for the lifetime of this effect.
    if (useAuthStore.getState().impersonating) {
      setInitialized();
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setAccessToken(session.access_token);

        // Only set right before a Discord OAuth redirect (see LoginForm) —
        // present here means we've just landed back from that round trip
        // and should restore the deep link instead of settling on the Hub.
        try {
          const pending = sessionStorage.getItem(PENDING_LOGIN_REDIRECT_KEY);
          if (pending) {
            sessionStorage.removeItem(PENDING_LOGIN_REDIRECT_KEY);
            router.navigate(pending, { replace: true });
          }
        } catch {
          // sessionStorage unavailable — nothing to restore
        }

        // Same round-trip problem, for linking a Discord identity onto an
        // already-signed-in account (see startDiscordLink in auth.service.ts).
        // Supabase's access token doesn't carry the newly-linked identity's
        // data itself, so this just tells the backend "go sync it" — the
        // backend independently re-fetches the real identity from Supabase.
        try {
          const pendingLink = sessionStorage.getItem(PENDING_DISCORD_LINK_KEY);
          if (pendingLink) {
            sessionStorage.removeItem(PENDING_DISCORD_LINK_KEY);
            linkDiscordAccount()
              .then(() => {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
                toast("success", "Discord-account gekoppeld!");
              })
              .catch(() => {
                toast("error", "Koppelen van Discord is niet gelukt. Probeer het opnieuw via je profiel.");
              });
          }
        } catch {
          // sessionStorage unavailable — nothing to sync
        }
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

// On Android, an installed app backgrounded for a while can have its renderer
// frozen or discarded by the OS; resuming sometimes leaves the page in a dead
// state (blank/gray, no re-render) that nothing short of force-closing recovers
// from. Forcing a real reload after a long hidden period reproduces exactly
// what that force-close does, automatically.
const STALE_HIDDEN_MS = 5 * 60_000;

function StaleResumeGuard() {
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAt.current = Date.now();
        return;
      }
      if (hiddenAt.current !== null && Date.now() - hiddenAt.current > STALE_HIDDEN_MS) {
        window.location.reload();
      }
      hiddenAt.current = null;
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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
        src="/assets/images/ankerd-mascotte.png"
        alt=""
        draggable={false}
        className="absolute -bottom-12 -right-12 w-[380px] select-none opacity-[0.045] dark:opacity-[0.055]"
        style={{ transform: "rotate(6deg)" }}
      />
      {/* Nerd logo — smaller, top-left, softly rotated */}
      <img
        src="/assets/images/ankerd-nerd-logo.png"
        alt=""
        draggable={false}
        className="absolute -top-10 -left-10 w-[200px] select-none opacity-[0.035] dark:opacity-[0.045]"
        style={{ transform: "rotate(-8deg)" }}
      />
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
    </div>
  );
}

function TimeTravelGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const widgetEnabled = useTimeStore((s) => s.widgetEnabled);
  if (!isAuthenticated || !widgetEnabled) return null;
  return <TimeTravelWidget />;
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        <AuthSync /> {/* <- Dropped it right here! */}
        <StaleResumeGuard />
        <AppBackdrop />
        <ImpersonationBanner />
        <Suspense fallback={<RouteFallback />}>
          <RouterProvider router={router} />
        </Suspense>
        <ToastContainer />
        <SplashController />
        <TimeTravelGate />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}