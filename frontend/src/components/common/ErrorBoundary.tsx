import { Component, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-paper px-6 py-12 select-none">
      <motion.div
        className="flex max-w-sm flex-col items-center text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <img
          src="/assets/images/ankerd-logo.png"
          alt=""
          className="mb-5 h-16 w-16 object-contain"
          draggable={false}
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          <AlertTriangle size={24} />
        </div>

        <h1 className="mt-4 font-display text-[42px] font-extrabold uppercase leading-[0.95] text-ink">
          Er ging iets mis
        </h1>
        <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-ink-2">
          De app is onverwacht vastgelopen. Probeer het opnieuw, of ga terug naar het startscherm.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border-1.5 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3"
          >
            Probeer opnieuw
          </button>
          <a href={routes.hub} className="btn-primary px-4 py-2.5 text-sm">
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
        <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
          <div className="h-8 w-8 rounded-full border-2 border-brand-text border-t-transparent animate-spin" />
        </div>
      );
    }
    return this.props.children;
  }
}
