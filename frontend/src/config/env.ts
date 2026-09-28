/**
 * Type-safe environment variable access.
 * Throws at startup if a required variable is missing.
 */
function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\nAdd it to your .env file.`,
    );
  }
  return value;
}

export const env = {
  /** Backend base URL. Empty string forces relative paths for the Vite Proxy! */
  API_BASE_URL: (import.meta.env["VITE_API_URL"] as string | undefined) ?? "",
  SUPABASE_URL: requireEnv("VITE_SUPABASE_URL"),
  SUPABASE_PUBLISHABLE_KEY: requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  DEV:  import.meta.env.DEV  as boolean,
  PROD: import.meta.env.PROD as boolean,
  // Public by design (it's handed to the browser's Push API) — optional, so a
  // deploy that hasn't set it up yet just doesn't offer push, nothing throws.
  VAPID_PUBLIC_KEY: (import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined) ?? "",
} as const;
