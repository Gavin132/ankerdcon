/**
 * The screens `mobile-audit.mjs` visits, on the made-up data of mock mode (src/dev/mock). One entry per
 * screen or state worth looking at: a route, and optionally what to do on it first (open a sheet, a menu).
 *
 *   name      shown in the report and used for the screenshot file
 *   path      what to open (mock mode is added to the address)
 *   role      who is signed in: member (default), admin or viewer
 *   scenario  only in this scenario of the main trip: upcoming, live or past (default: every scenario asked for)
 *   steps     async (page) => {}, run once the screen has loaded; a step that cannot find its button is reported,
 *             it does not stop the run
 */
const click = (matcher) => async (page) => {
  await matcher(page).first().click({ timeout: 3000 });
  await page.waitForTimeout(700);
};
const byLabel = (re) => (page) => page.getByRole("button", { name: re });
const byText = (re) => (page) => page.locator("button, a").filter({ hasText: re });

const checkbox = (re) => (page) => page.getByRole("checkbox", { name: re });
/** Several steps one after the other: each one is a `click(...)` or any async (page) => {}. */
const then = (...steps) => async (page) => { for (const step of steps) await step(page); };

const TRIP = "/trips/trip-hmia";

export const screens = [
  // ── The five tabs ──────────────────────────────────────────────────────────
  { name: "hub", path: "/" },
  { name: "agenda", path: "/calendar" },
  { name: "agenda-link", path: "/calendar", steps: click(byText(/Agenda-link/)) },
  { name: "agenda-recap", path: "/calendar", steps: click(byText(/^Recap$/)) },
  { name: "agenda-past", path: "/calendar", scenario: "past" },
  { name: "finance", path: "/finance" },
  { name: "crew", path: "/crew" },
  { name: "crew-ping", path: "/crew", steps: click(byText(/Locatie pingen/)) },

  // ── Money ──────────────────────────────────────────────────────────────────
  { name: "finance-ritkosten", path: "/finance", scenario: "live", steps: click(byText(/Jij reed/)) },
  { name: "finance-settle", path: "/finance?settle=st-1" },
  { name: "finance-expense", path: "/finance?expense=e-1" },
  { name: "finance-add-expense", path: "/finance", steps: click(byText(/Uitgave toevoegen/)) },

  // ── A trip: the page and every sheet that opens over it ───────────────────
  { name: "trip", path: TRIP },
  { name: "trip-day2", path: `${TRIP}?day=d-hmia-2` },
  { name: "trip-transport", path: `${TRIP}?sheet=transport` },
  { name: "trip-food", path: `${TRIP}?sheet=food` },
  { name: "trip-rooms", path: `${TRIP}?sheet=rooms` },
  { name: "trip-cosplay", path: `${TRIP}?sheet=cosplay` },
  { name: "trip-photos", path: `${TRIP}?sheet=photos` },
  { name: "trip-transport-form", path: `${TRIP}?sheet=transport`, steps: click(byText(/Rit aanbieden/)) },
  { name: "trip-admin", path: TRIP, role: "admin" },
  { name: "trip-rooms-admin", path: `${TRIP}?sheet=rooms`, role: "admin" },
  { name: "trip-rooms-add", path: `${TRIP}?sheet=rooms`, steps: click(byText(/Nieuwe kamer/)) },
  { name: "trip-rooms-edit", path: `${TRIP}?sheet=rooms`, steps: click(byLabel(/Kamer 216 bewerken/)) },
  { name: "trip-rooms-bulk", path: `${TRIP}?sheet=rooms`, steps: click(byText(/Meerdere/)) },
  { name: "trip-cosplay-form", path: `${TRIP}?sheet=cosplay`, steps: click(byText(/^Toevoegen$/)) },
  { name: "trip-meal-form", path: TRIP, steps: click(byLabel(/Activiteit toevoegen/)) },
  { name: "trip-practical", path: TRIP, steps: click(byText(/^Info$/)) },
  { name: "trip-participants", path: TRIP, steps: click((p) => p.locator("button[aria-haspopup=dialog]")) },
  { name: "trip-single-day", path: "/trips/d-gathering" },
  { name: "trip-past", path: "/trips/trip-hdcc25" },
  { name: "trip-travel-day", path: "/trips/trip-dokomi" },

  // ── Detail pages ───────────────────────────────────────────────────────────
  { name: "meal", path: "/meals/m-dinner" },
  { name: "meal-long-title", path: "/meals/m-escape" },
  { name: "meal-viewer", path: "/meals/m-escape", role: "viewer" },
  // m-game: you are not on the list, so the button is "Aanmelden". m-dinner: you are, so it is "Iemand aanmelden".
  { name: "meal-rsvp-sheet", path: "/meals/m-game", steps: click(byText(/^\s*Aanmelden$/)) },
  { name: "meal-rsvp-other-sheet", path: "/meals/m-dinner", steps: click(byText(/Iemand aanmelden/)) },
  { name: "meal-cancel-sheet", path: "/meals/m-dinner", steps: click(byText(/^\s*Afmelden$/)) },
  { name: "ride", path: "/rides/r-1" },
  { name: "ride-restaurant", path: "/rides/r-7" },
  { name: "ride-viewer", path: "/rides/r-1", role: "viewer" },
  { name: "ride-claim-sheet", path: "/rides/r-1", steps: click(byText(/Stap in/)) },
  { name: "profile-me", path: "/profile/u-gavin" },
  { name: "profile-me-dirty", path: "/profile/u-gavin", steps: async (page) => { await page.locator("textarea").first().fill("Nieuwe tekst"); await page.waitForTimeout(400); } },
  { name: "profile-other", path: "/profile/u-sam" },
  { name: "profile-long-name", path: "/profile/u-long" },
  { name: "profile-not-found", path: "/profile/niemand-bekend" },
  { name: "not-found", path: "/dit-bestaat-niet" },

  // ── Settings ───────────────────────────────────────────────────────────────
  { name: "settings", path: "/settings" },
  { name: "settings-feedback", path: "/settings", steps: click(byText(/Feedback geven/)) },
  { name: "notifications", path: "/settings/notifications" },
  { name: "changelog", path: "/settings/changelog" },

  // ── Overlays on the hub ────────────────────────────────────────────────────
  { name: "hub-quick-offer", path: "/", steps: click(byText(/Rit aanbieden/)) },
  { name: "hub-account-menu", path: "/", steps: click(byLabel(/account|menu|profiel/i)) },
  { name: "hub-search", path: "/", steps: click(byLabel(/zoeken/i)) },
  { name: "hub-story-viewer", path: "/", steps: click(byText(/^Vr|^Za|^Zo|^Do/)) },

  // ── What a read-only member and an admin see ──────────────────────────────
  { name: "hub-viewer", path: "/", role: "viewer" },
  { name: "trip-viewer", path: TRIP, role: "viewer" },
  { name: "hub-admin", path: "/", role: "admin" },

  // ── The admin panel ────────────────────────────────────────────────────────
  { name: "admin-dashboard", path: "/admin", role: "admin" },
  { name: "admin-users", path: "/admin/users", role: "admin" },
  { name: "admin-users-empty", path: "/admin/users", role: "admin", steps: async (page) => { await page.getByPlaceholder(/Zoek/).first().fill("zzzz"); await page.waitForTimeout(600); } },
  { name: "admin-rides-empty", path: "/admin/rides", role: "admin", steps: async (page) => { await page.getByPlaceholder(/Zoek/).first().fill("zzzz"); await page.waitForTimeout(600); } },
  { name: "admin-users-add", path: "/admin/users", role: "admin", steps: click(byText(/nieuwe gebruiker/i)) },
  { name: "admin-users-selected", path: "/admin/users", role: "admin", steps: click(checkbox(/Selecteer /)) },
  { name: "admin-users-bulk-delete", path: "/admin/users", role: "admin", steps: then(click(checkbox(/Selecteer /)), click(byText(/^Verwijderen$/))) },
  { name: "admin-users-edit", path: "/admin/users", role: "admin", steps: click(byLabel(/bewerken$/i)) },
  { name: "admin-users-placeholders", path: "/admin/users", role: "admin", steps: click(byText(/^Placeholders/)) },
  { name: "admin-users-merge", path: "/admin/users", role: "admin", steps: click(byLabel(/samenvoegen met een lid$/i)) },
  {
    name: "admin-users-merge-preview", path: "/admin/users", role: "admin",
    steps: then(
      click(byLabel(/samenvoegen met een lid$/i)),
      async (page) => { await page.getByPlaceholder(/Zoek een lid/).fill("Sam"); await page.waitForTimeout(300); },
      click((p) => p.getByRole("button", { name: /Sam$/ })),
    ),
  },
  { name: "admin-whitelist", path: "/admin/whitelist", role: "admin" },
  { name: "admin-rides", path: "/admin/rides", role: "admin" },
  { name: "admin-rides-edit", path: "/admin/rides", role: "admin", steps: click(byLabel(/bewerken$/i)) },
  { name: "admin-meals", path: "/admin/meals", role: "admin" },
  { name: "admin-meals-edit", path: "/admin/meals", role: "admin", steps: click(byLabel(/bewerken$/i)) },
  { name: "admin-meal-categories", path: "/admin/meal-categories", role: "admin" },
  { name: "admin-events", path: "/admin/events", role: "admin" },
  { name: "admin-events-history", path: "/admin/events", role: "admin", steps: click(byText(/^Geschiedenis$/)) },
  { name: "admin-events-edit", path: "/admin/events", role: "admin", steps: click((p) => p.locator("button[title=Bewerken]")) },
  { name: "admin-events-delete-day", path: "/admin/events", role: "admin", steps: then(click((p) => p.locator("button[title=Bewerken]")), click(byLabel(/^Dag .* verwijderen$/))) },
  { name: "admin-event-groups", path: "/admin/event-groups", role: "admin" },
  { name: "admin-badges", path: "/admin/badges", role: "admin" },
  { name: "admin-badges-edit", path: "/admin/badges", role: "admin", steps: click(byLabel(/bewerken$/i)) },
  { name: "admin-betalingen", path: "/admin/betalingen", role: "admin" },
  { name: "admin-betalingen-open", path: "/admin/betalingen", role: "admin", steps: click(byText(/Hotel, 2 nachten/)) },
  { name: "admin-betalingen-person-open", path: "/admin/betalingen", role: "admin", steps: click(byText(/66,40/)) },
  { name: "admin-announcements", path: "/admin/announcements", role: "admin" },
  { name: "admin-announcements-edit", path: "/admin/announcements", role: "admin", steps: click(byLabel(/bewerken$/i)) },
  { name: "admin-changelog", path: "/admin/changelog", role: "admin" },
  { name: "admin-changelog-edit", path: "/admin/changelog", role: "admin", steps: click(byLabel(/bewerken$/i)) },
  { name: "admin-impersonate", path: "/admin/impersonate", role: "admin" },
  { name: "admin-time-travel", path: "/admin/time-travel", role: "admin" },
  { name: "admin-screens", path: "/admin/screens", role: "admin" },
  { name: "status-crash", path: "/admin/screens", role: "admin", steps: click(byText(/Er ging iets mis/)) },
  { name: "status-unreachable", path: "/admin/screens", role: "admin", steps: click(byText(/Kan de server niet bereiken/)) },
  { name: "status-forbidden", path: "/admin/screens", role: "admin", steps: click(byText(/^Geen toegang(?! \()/)) },
  { name: "admin-cdn", path: "/admin/cdn", role: "admin" },
  { name: "admin-feedback", path: "/admin/feedback", role: "admin" },
  { name: "admin-preview-onboarding", path: "/admin/preview/onboarding", role: "admin" },
];
