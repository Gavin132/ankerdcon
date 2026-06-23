import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { router } from "./router";
import { ToastContainer } from "./components/common/Toast";
import { SplashScreen } from "./components/splash/SplashScreen";
import { useThemeStore } from "./store/theme.store";
import { useSplash } from "./hooks/useSplash";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
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
      <RouterProvider router={router} />
      <ToastContainer />
      <SplashController />
    </QueryClientProvider>
  );
}
