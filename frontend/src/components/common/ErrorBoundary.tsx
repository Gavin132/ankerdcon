import { Component, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { routes } from "../../config/routes";
import { attemptAutoReload, resetAppAndReload } from "../../utils/errorRecovery";
import { clearPersistedQueries } from "../../lib/queryPersist";
import { StatusScreen } from "./StatusScreen";
import { LoadingSpinner } from "./LoadingSpinner";
import { CrashFeedback } from "./CrashFeedback";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  giveUp: boolean;
  error?: unknown;
}

/** What went wrong, short enough to read off a screenshot. */
function describeError(error: unknown): string | null {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : typeof error === "string" ? error : "";
  return text ? text.slice(0, 240) : null;
}

/** The branded "something crashed" screen — also used directly by
 * `RouteErrorFallback` for errors React Router's data router catches
 * before they'd ever reach this component.
 *
 * Above every other layer (the "Nieuwe versie" banner, toasts): nothing may
 * cover its buttons, and both of its buttons do what that banner would, and more.
 * Its buttons start over from the server instead of reloading the same stored
 * data into the same crash. */
export function ErrorFallback({ error }: { error?: unknown }) {
  const [busy, setBusy] = useState(false);
  const detail = describeError(error);

  // Reaching this screen means a reload did not help, so whatever this device has
  // saved is the first suspect. Dropping it now means even closing the app and
  // opening it again gets a clean start.
  useEffect(() => clearPersistedQueries(), []);

  function reset(to?: string) {
    setBusy(true);
    void resetAppAndReload(to);
  }

  return (
    <StatusScreen
      topmost
      mark={{ icon: <AlertTriangle size={24} />, tone: "bad" }}
      title="Er ging iets mis"
      statusLink
      actions={
        <>
          <button type="button" disabled={busy} onClick={() => reset()} className="btn-primary px-4 text-sm">
            {busy ? "Even geduld…" : "Probeer opnieuw"}
          </button>
          <button type="button" disabled={busy} onClick={() => reset(routes.hub)} className="btn-primary px-4 py-2.5 text-sm">
            Terug naar start
          </button>
        </>
      }
      details={
        <>
          {detail && (
            <p className="max-w-[320px] break-words rounded-lg bg-sunken px-3 py-2 text-left font-mono text-[12px] leading-snug text-ink-3 select-text">
              {detail}
            </p>
          )}
          <CrashFeedback detail={detail} />
        </>
      }
    >
      <p>De app is onverwacht vastgelopen. Probeer het opnieuw, of ga terug naar het startscherm.</p>
    </StatusScreen>
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
    this.setState({ error });
    if (!attemptAutoReload()) {
      this.setState({ giveUp: true });
    }
  }

  render() {
    if (this.state.giveUp) {
      return <ErrorFallback error={this.state.error} />;
    }
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
          <LoadingSpinner />
        </div>
      );
    }
    return this.props.children;
  }
}
