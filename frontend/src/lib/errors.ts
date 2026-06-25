import { ApiError } from "./api/client";

const DEFAULT_MESSAGES: Partial<Record<number, string>> = {
  401: "Je bent niet ingelogd. Log opnieuw in.",
  403: "Je hebt geen toestemming voor deze actie.",
  404: "De gevraagde informatie kon niet worden gevonden.",
  409: "Dit verzoek conflicteert met de huidige toestand.",
  422: "Ongeldige invoer. Controleer je gegevens.",
};

/**
 * Converts an unknown caught error into a safe, user-friendly Dutch message.
 * Never leaks raw backend error strings to the UI.
 *
 * @param error     - The caught value (ApiError, Error, or unknown).
 * @param fallback  - Shown when no specific mapping applies.
 * @param overrides - Per-status-code overrides for the current context.
 *                    e.g. { 404: "Rit niet gevonden." }
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Er is iets misgegaan. Probeer het opnieuw.",
  overrides?: Partial<Record<number, string>>,
): string {
  if (error instanceof ApiError) {
    const messages = { ...DEFAULT_MESSAGES, ...overrides };
    if (messages[error.status]) return messages[error.status]!;
    if (error.status >= 500)
      return "Er is een serverfout opgetreden. Probeer het later opnieuw.";
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("network") || msg.includes("failed to fetch"))
      return "Verbindingsfout. Controleer je internetverbinding.";
    if (msg.includes("timeout"))
      return "Het verzoek heeft te lang geduurd. Probeer het opnieuw.";
  }

  return fallback;
}
