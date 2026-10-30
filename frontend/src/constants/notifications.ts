/**
 * Per-user Discord DM notification categories. These are opt-in and separate
 * from the shared Discord channel, which always gets every announcement
 * regardless of anyone's preferences here — this list only controls what
 * additionally lands in a user's own DMs.
 *
 * Keep the `id` values in sync with NotificationCategory in
 * backend/app/services/notification_service.py.
 */
export interface NotificationCategoryDef {
  id: string;
  label: string;
  description: string;
  /** Where it is listed on the settings page. */
  group: NotificationGroupId;
  /** Only offered to admins (the backend refuses it for anyone else). */
  adminOnly?: boolean;
}

export type NotificationGroupId = "events" | "plans" | "admin";

export const NOTIFICATION_GROUPS: { id: NotificationGroupId; label: string; hint?: string }[] = [
  { id: "events", label: "Evenementen" },
  { id: "plans", label: "Plannen", hint: "Rondom een trip waar je naartoe gaat." },
  { id: "admin", label: "Voor beheerders" },
];

export const NOTIFICATION_CATEGORIES: NotificationCategoryDef[] = [
  { id: "event_created", group: "events", label: "Nieuw evenement", description: "Wanneer een beheerder een nieuw evenement aanmaakt." },
  { id: "ticket_sale", group: "events", label: "Kaartverkoop", description: "24 uur voor en op het moment dat de verkoop start." },
  { id: "event_reminder_7d", group: "events", label: "Herinnering — 1 week van tevoren", description: "Een week voordat een evenement begint." },
  { id: "event_reminder_1d", group: "events", label: "Herinnering — 1 dag van tevoren", description: "De dag voordat een evenement begint." },
  { id: "event_reminder_day_of", group: "events", label: "Herinnering — op de dag zelf", description: "Op de dag van het evenement zelf." },
  { id: "ride_created", group: "plans", label: "Nieuwe rit", description: "Wanneer iemand een rit aanmaakt." },
  { id: "expense_created", group: "plans", label: "Nieuwe uitgave", description: "Wanneer iemand een groepsuitgave toevoegt." },
  { id: "ticket_vote", group: "plans", label: "Ticketstemming", description: "Wanneer een beheerder een stemming over de tickets opent en wanneer de tickets gekocht zijn." },
  { id: "meal_created", group: "plans", label: "Nieuwe activiteit", description: "Wanneer iemand een activiteit plant, zoals een etentje of bowlen." },
  { id: "feedback_submitted", group: "admin", label: "Nieuwe feedback", description: "Wanneer iemand een bug, idee of opmerking instuurt. Alleen voor admins.", adminOnly: true },
  { id: "new_user", group: "admin", label: "Nieuwe gebruiker", description: "Wanneer iemand voor het eerst inlogt, zodat je weet wanneer er een profiel is om samen te voegen. Alleen voor admins.", adminOnly: true },
];

/** The categories this member can choose from. */
export function categoriesFor(isAdmin: boolean): NotificationCategoryDef[] {
  return NOTIFICATION_CATEGORIES.filter((c) => !c.adminOnly || isAdmin);
}

/**
 * The choices to save. A member who is no longer an admin may still carry an admin category from
 * when they were; the backend refuses those from anyone else, so they are left out instead of
 * making every save fail.
 */
export function categoriesToSave(chosen: string[], isAdmin: boolean): string[] {
  if (isAdmin) return chosen;
  return chosen.filter((id) => !NOTIFICATION_CATEGORIES.some((c) => c.id === id && c.adminOnly));
}

/** What "Alleen belangrijk" switches on: what you would miss something over. */
export const IMPORTANT_CATEGORY_IDS: readonly string[] = [
  "event_created",
  "ticket_sale",
  "event_reminder_1d",
  "event_reminder_day_of",
  "expense_created",
  "ticket_vote",
];

export type NotificationPreset = "all" | "important" | "none";

/** The choices a preset makes, for a member who can choose from `available`. */
function presetIds(preset: NotificationPreset, available: NotificationCategoryDef[]): string[] {
  if (preset === "none") return [];
  return available.filter((c) => preset === "all" || IMPORTANT_CATEGORY_IDS.includes(c.id)).map((c) => c.id);
}

/**
 * A preset applied to the current choices. A category the member cannot see or change with the presets
 * (the admin ones) is left exactly as it was.
 */
export function applyPreset(preset: NotificationPreset, current: string[], isAdmin: boolean): string[] {
  const regular = categoriesFor(isAdmin).filter((c) => !c.adminOnly);
  const kept = current.filter((id) => !regular.some((c) => c.id === id));
  return [...kept, ...presetIds(preset, regular)];
}

/** Which preset the current choices are exactly, if any (so its chip can show as selected). */
export function activePreset(current: string[], isAdmin: boolean): NotificationPreset | null {
  const regular = categoriesFor(isAdmin).filter((c) => !c.adminOnly);
  const chosen = new Set(current.filter((id) => regular.some((c) => c.id === id)));
  for (const preset of ["none", "important", "all"] as const) {
    const want = new Set(presetIds(preset, regular));
    if (want.size === chosen.size && [...want].every((id) => chosen.has(id))) return preset;
  }
  return null;
}
