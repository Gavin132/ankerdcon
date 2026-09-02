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
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryDef[] = [
  { id: "event_created", label: "Nieuw evenement", description: "Wanneer een beheerder een nieuw evenement aanmaakt." },
  { id: "ticket_sale", label: "Kaartverkoop", description: "24 uur voor en op het moment dat de verkoop start." },
  { id: "event_reminder_7d", label: "Herinnering — 1 week van tevoren", description: "Een week voordat een evenement begint." },
  { id: "event_reminder_1d", label: "Herinnering — 1 dag van tevoren", description: "De dag voordat een evenement begint." },
  { id: "event_reminder_day_of", label: "Herinnering — op de dag zelf", description: "Op de dag van het evenement zelf." },
  { id: "ride_created", label: "Nieuwe rit", description: "Wanneer iemand een rit aanmaakt." },
  { id: "expense_created", label: "Nieuwe uitgave", description: "Wanneer iemand een groepsuitgave toevoegt." },
  { id: "meal_created", label: "Nieuwe maaltijd", description: "Wanneer iemand een maaltijd plant." },
];
