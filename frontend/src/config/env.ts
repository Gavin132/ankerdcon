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
  /** Backend base URL. Falls back to localhost for local development. */
  API_BASE_URL: (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000",
  SUPABASE_URL: requireEnv("VITE_SUPABASE_URL"),
  SUPABASE_PUBLISHABLE_KEY: requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  DEV:  import.meta.env.DEV  as boolean,
  PROD: import.meta.env.PROD as boolean,
} as const;
