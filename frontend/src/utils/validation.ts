// ─── Display name ────────────────────────────────────────────────────────────

const NAME_REGEX = /^[\w\s\-.]+$/u;

export function validateDisplayName(value: string): string | null {
  const v = value.trim();
  if (v.length < 2) return "Minimaal 2 tekens";
  if (v.length > 30) return "Maximaal 30 tekens";
  if (!NAME_REGEX.test(v)) return "Alleen letters, cijfers, spaties, - en .";
  return null;
}

// ─── Phone number ─────────────────────────────────────────────────────────────
// Accepts international (+31) and local (06) formats.
// Strips spaces, dashes, dots and parentheses before checking digit count.

export function validatePhoneNumber(value: string): string | null {
  if (!value.trim()) return null; // optional field
  const stripped = value.replace(/[\s\-().]/g, "");
  if (!/^\+?[0-9]{7,15}$/.test(stripped)) {
    return "Voer een geldig nummer in (bijv. +31 6 12345678 of 06-12345678)";
  }
  return null;
}
