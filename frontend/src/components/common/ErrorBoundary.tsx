import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level safety net. Without this, any uncaught render error — e.g. a stale
 * auth token racing a refresh right after the app resumes from a long Android
 * background sleep — unmounts the whole React tree and leaves a blank/gray
 * screen with no way back except force-closing the app. Reloading is the same
 * recovery a force-close achieves, just automatic.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Uncaught render error — reloading to recover:", error);
    window.location.reload();
  }

  render() {
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
