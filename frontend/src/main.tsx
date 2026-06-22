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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
