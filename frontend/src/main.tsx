import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

// Apply dark class synchronously before first render to prevent flash
try {
  const stored = localStorage.getItem("ankerd-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (stored === "dark" || (stored === null && prefersDark)) {
    document.documentElement.classList.add("dark");
  }
} catch {}

async function start() {
  // Mock mode: the app on made-up data, signed in as nobody, for looking at every screen at phone sizes
  // (`/?mock`, docs/local-development.md#mock-mode). Development builds only; `import.meta.env.DEV` is a
  // constant, so a production build drops this branch and the whole `dev/` folder with it.
  if (import.meta.env.DEV) {
    // Remembered for the tab, so a reload (or an address typed without it) stays in mock mode.
    const wanted = new URLSearchParams(window.location.search).has("mock") || sessionStorage.getItem("ankerd_mock") !== null;
    if (wanted) {
      const { installMock } = await import("./dev/mock");
      installMock();
    }
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
