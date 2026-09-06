import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// Single source of truth for the app version — backend/VERSION. Bump it
// there only; the backend reads the same file at runtime (see backend/main.py).
const appVersion = readFileSync("../backend/VERSION", "utf-8").trim();

export default defineConfig(({ mode }) => {
  // Load env file based on `mode`. The third parameter '' loads all env variables.
  const env = loadEnv(mode, process.cwd(), '');

  // Dynamic variables with safe fallbacks for local (non-Docker) development
  const allowedHost = env.ALLOWED_HOST || 'localhost';
  const backendUrl = env.BACKEND_URL || 'http://localhost:8000';

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
      allowedHosts: [allowedHost],
      proxy: {
        "/api": {
          target: backendUrl, // Now dynamically pointing to the correct container!
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "../backend/dist",
      emptyOutDir: true,
    },
  };
});