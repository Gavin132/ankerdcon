import { Component, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { NightSkyBackdrop } from "./NightSkyBackdrop";
import { routes } from "../../config/routes";
import { attemptAutoReload } from "../../utils/errorRecovery";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  giveUp: boolean;
}

/** The branded "something crashed" screen — also used directly by
 * `RouteErrorFallback` for errors React Router's data router catches
 * before they'd ever reach this component. */
export function ErrorFallback() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "linear-gradient(170deg, #050c1e 0%, #081c3a 40%, #0c2d58 80%, #0e3460 100%)" }}
    >
      <NightSkyBackdrop />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-5 px-8 text-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{ background: "rgba(239,68,68,0.18)", border: "1.5px solid rgba(239,68,68,0.35)" }}
        >
          <AlertTriangle size={38} className="text-rose-400" />
        </div>

        <div>
          <p className="text-[28px] font-black text-white leading-tight">Er ging iets mis</p>
          <p className="mt-2 text-sm text-white/50 max-w-[280px] leading-relaxed">
            De app is onverwacht vastgelopen. Probeer het opnieuw, of ga terug naar het startscherm.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white/60 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Probeer opnieuw
          </button>
          <a
            href={routes.hub}
            className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Terug naar start
          </a>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Top-level safety net. Without this, any uncaught render error — e.g. a stale
 * auth token racing a refresh right after the app resumes from a long Android
 * background sleep — unmounts the whole React tree and leaves a blank/gray
 * screen with no way back except force-closing the app.
 *
 * The first error within a 10s window triggers one automatic reload, which
 * recovers the common transient case for free. If an error strikes again
 * shortly after that reload — meaning the reload didn't actually fix
 * anything — reloading forever would just spin the user through the same
 * blank screen, so it falls back to `ErrorFallback` instead, with a manual
 * retry and a way back to the home screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, giveUp: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Uncaught render error:", error);
    if (!attemptAutoReload()) {
      this.setState({ giveUp: true });
    }
  }

  render() {
    if (this.state.giveUp) {
      return <ErrorFallback />;
    }
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        </div>
      );
    }
    return this.props.children;
  }
}
