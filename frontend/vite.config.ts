import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// Single source of truth for the app version — backend/VERSION. Bump it
// there only; the backend reads the same file at runtime (see backend/main.py).
const appVersion = readFileSync("../backend/VERSION", "utf-8").trim();

// Swaps the PWA's icon/manifest/theme-color/title in index.html when this is
// a dev build — set via APP_ENV, a plain build-time var (not exposed to the
// browser, unlike VITE_-prefixed ones). This only rewrites references; the
// actual dev icon files (favicon-dev.png, apple-touch-icon-dev.png,
// icons/dev/icon-192.png, icons/dev/icon-512.png,
// icons/dev/icon-maskable-512.png, manifest.dev.json) need to exist under
// public/ for those references to resolve to anything.
function devIconPlugin(isDev: boolean) {
  return {
    name: "dev-icon-swap",
    transformIndexHtml(html: string) {
      if (!isDev) return html;
      return html
        .replace(
          '<link rel="icon" type="image/x-icon" href="/favicon.ico" />',
          '<link rel="icon" type="image/png" href="/favicon-dev.png" />',
        )
        .replace('href="/apple-touch-icon.png"', 'href="/apple-touch-icon-dev.png"')
        .replace('href="/manifest.json"', 'href="/manifest.dev.json"')
        .replace('content="#F5F8F9"', 'content="#EA6A1F"')
        .replace(
          '<meta name="apple-mobile-web-app-title" content="Ankerd Con" />',
          '<meta name="apple-mobile-web-app-title" content="Ankerd Con (Dev)" />',
        )
        .replace("<title>Ankerd Con</title>", "<title>Ankerd Con (Dev)</title>");
    },
  };
}

// Emits sw/service-worker.js as /sw.js with the version stamped in, so each
// release gets its own caches and clears out the previous ones. It's kept out
// of public/ deliberately: that would ship it unversioned, and a worker that
// never changes byte-for-byte is a worker that never updates.
function serviceWorkerPlugin(version: string) {
  return {
    name: "emit-service-worker",
    apply: "build" as const,
    generateBundle(this: { emitFile: (f: { type: "asset"; fileName: string; source: string }) => void }) {
      // Version *plus* build time: the worker must differ byte-for-byte between
      // builds, otherwise the browser sees no change and never replaces it.
      const buildId = `${version}-${Date.now().toString(36)}`;
      const source = readFileSync("sw/service-worker.js", "utf-8").replace("__SW_VERSION__", buildId);
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load env file based on `mode`. The third parameter '' loads all env variables.
  const env = loadEnv(mode, process.cwd(), '');

  // Dynamic variables with safe fallbacks for local (non-Docker) development
  const allowedHost = env.ALLOWED_HOST || 'localhost';
  const backendUrl = env.BACKEND_URL || 'http://localhost:8000';
  const isDevBuild = env.APP_ENV === "dev";

  return {
    plugins: [react(), devIconPlugin(isDevBuild), serviceWorkerPlugin(appVersion)],
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
      rollupOptions: {
        output: {
          // Hex hashes (Vite 6 defaults to base64). The backend's cache headers
          // (backend/main.py) and the service worker (sw/service-worker.js)
          // recognise build output by a `-<hex>.` file name suffix.
          hashCharacters: "hex",
          // Long-lived libraries get their own chunks so an app deploy doesn't
          // bust their cache, and the browser can fetch them in parallel. Only
          // libs the app shell needs on every page are listed — recharts etc.
          // stay in the lazy admin chunk.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "vendor-react";
            if (id.includes("node_modules/framer-motion")) return "vendor-motion";
            if (id.includes("node_modules/@supabase")) return "vendor-supabase";
            if (id.includes("node_modules/@tanstack")) return "vendor-query";
            return undefined;
          },
        },
      },
    },
  };
});