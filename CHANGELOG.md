# Changelog

All notable changes to Ankerd Con are documented here.

---

## [Unreleased]

### Added

- When the app cannot start (an old iPhone, a stale cached copy) it now shows a "Ankerd Con kan niet
  starten" screen with what to try and the errors it saw, instead of a blank white page.

---

## [2.0.2] - 2026-09-28

Quick patch: small features and fixes on top of 2.0.1.

### Added

- **Mijn ticket** on the event page: save a photo or PDF of your own event ticket, kept only in
  this browser (IndexedDB) — never uploaded, never visible to anyone else, not even admins.
- **A Hub shortcut for it**: a card next to "Locatie pingen" that jumps straight to the current
  trip's ticket sheet, and says whether you've saved one yet.
- **Accent colour**: pick blue, turquoise, green, gold, orange, pink or purple under Instellingen →
  Accentkleur. Per device; only the brand colour changes.
- **Feedback**: Instellingen → Feedback geven sends a bug, idea or remark to the admins, optionally
  anonymous (no name is stored). Admins read and triage it under Admin → Feedback. Needs migration
  v2.28 (the `feedback` table) before the deploy.
- **No-internet banner**: an amber bar at the top of every page while the device has no connection.
- **Zip download on the admin CDN page** for whatever is shown (a feature, or one event's story
  photos), streamed while it is built.
- **A one-time hint** on the event page pointing out that you can swipe sideways to the next or
  previous trip — shown once ever per device, and cut short the moment someone actually swipes.
- The event page's content now slides in from the side you swiped towards.

### Changed

- **Photos keep more detail**: they are resized to 2560 px (was 1600) at JPEG 88 %, and a photo
  the app already compressed is no longer re-encoded a second time by the server. Older photos are
  unchanged.
- The Hub's upcoming-trips carousel now advances itself every 10 seconds when there's more than
  one. Pauses in a background tab, is skipped under "reduce motion", and any manual swipe/dot/arrow
  restarts the countdown instead of fighting it.
- Shorter labels on three event tiles so they fit: Ticket, Info and Kosten.
- Someone refused after signing in with Google is told their Google account isn't linked and to try
  Discord if that is how they signed up.
- Admin "log in as" shows the real error instead of one canned message, and the backend warns at
  startup when `SUPABASE_JWT_SECRET` is empty.

### Fixed

- The back gesture (or Android back button) on a sheet such as Praktische info now closes the
  sheet instead of leaving it open over the page you went back to.
- The bottom navigation no longer jumps while swiping between events.
- The Cosplay tile's row of preview thumbnails could run past the edge of the card when a trip had
  several cosplays with images (e.g. a big convention like HMIA Brussels) — it's capped at 2 with a
  "+N" count now, and clipped defensively either way.

### Added for operators

- A branded Cloudflare error page (Worker in `cloudflare/`) for host and gateway errors, with an
  install guide in `docs/cloudflare-error-page.md`.

---

## [2.0.1] - 2026-09-27

Hotfixes after 2.0.

### Added

- **Other events from an event page:** a calendar button in the top bar and an "Andere evenementen"
  button under the tiles open a list of every trip (current and upcoming first, then past ones), to
  jump to another one without going through the Agenda.
- "Iemand aanmelden" (or "Aanmeldingen aanpassen" after the trip) is also in the list of who is going.

### Changed

- **Swipe between events** on the event page: swipe left for the next trip, right for the previous
  one (in date order, like the list under "Andere evenementen"). It ignores swipes on rows that
  scroll sideways, in text fields, from the screen edge (the browser's back gesture) and anything
  open on top of the page.
- On the Hub, the whole event card opens the event, not just its title and cover.

### Fixed

- **An admin could be thrown out to the "Geen toegang" screen by a database hiccup**, for example
  when opening the whitelist. The admin check treated a failed lookup as "not an admin", and the app
  showed that screen for *any* 403, including "this is not your meal" or "admins only". Now a failed
  lookup is a 503 (try again), and only the real "account not allowed" answers (not on the whitelist,
  deactivated), which carry an `X-Access: denied` header, show that screen. Other refusals are just an
  error message.
- The Hotel sheet's room cards no longer run out of the card on wide windows: the sheet is a fixed
  width, but its grid used to switch to three columns from a wide *window*, so on a big screen the
  cards were too narrow for their text (Edge, on a smaller window, was unaffected). Long names and
  instructions also wrap. The Vervoer sheet had the same problem with its three columns; its
  directions now stack.

---

## [2.0.0] - 2026-09-27

The first release since 1.5.0. The versions in between were never cut, so everything
below shipped together.

### Changed
- New look, based on the Ankerd mascot: flat surfaces with ink outlines,
  anchor cyan for the main action, Poppins for text and a condensed display
  face for names and countdowns. Works in light and dark mode.
  - On desktop the navigation moves to a sidebar (an icon rail on tablets)
    with the next trip as a wristband; phones keep the tab bar.
  - The Hub shows the nearest trip as a ticket with a countdown, and uses
    two columns on wide screens.
  - Every screen follows the new style, including trip pages, ride and meal
    pages, Agenda, Financiën, Crew, profile, settings, onboarding, error
    pages and the admin portal.
  - On desktop, transport shows Heen, Terug and Restaurant side by side, and
    Financiën puts your balance next to the expense list. "Add" buttons no
    longer stretch across the whole page there.
- New navigation built around trips. The tabs are now **Hub · Event ·
  Agenda · Financiën · Crew**.
  - **Event** opens the current trip, with Overzicht, Vervoer, Eten,
    Kamers, Cosplay and Foto's in one place for that trip.
  - Overzicht is now the trip's ticket with a tile for each part of the
    trip: Vervoer, Eten, Kamers, Cosplay, Foto's and Uitgaven. Each tile
    shows the answer (how many rides, who still has no ride back) and opens
    its own page to change things.
  - Tap a day on the ticket to sign up for it or off it. Weather and
    practical info unfold under the tiles.
  - The tiles reorder before, during and after a trip: plans first, then
    the next meal and photos, then photos and what you still owe.
  - The other pages get a compact header with the way back to Overzicht,
    and Kamers shows the hotel info and how many people still need a room.
  - Transport and Eten no longer mix every event together.
  - Multi-day trips get day buttons to filter by day.
- **Agenda** replaces the calendar under Meer, and past trips there show
  their story photos (replacing the separate story archive).
  - Upcoming trips are a stack of tickets with the event image, the days,
    who's going and a countdown. Swipe or use the arrows to flip through them.
  - "Ik ga mee" signs you up for every day of a trip in one tap;
    "Anderen aanmelden" signs up (or off) anyone else, for the days you pick.
  - Past trips are collected as stubs per year, with how many you went to,
    con days, hotel trips and photos. Tap a stub for its photos.
  - **Recap** replaces the month view and is built for looking back: days of
    past trips show their photos (grey when you didn't go), and a past trip
    opens a look-back with who went, photos per day and the rides and
    dinners. Upcoming trips still show sign-up and what's planned. Jump to any
    month, filter on "Waar ik was", and see what you did a year earlier.
- **Crew** combines the member lists with "Waar is iedereen" location pings.
- Personal settings (notifications, Discord, theme, greeting) now live in
  one place: **Instellingen** in the avatar menu. The Meer tab is gone.
- "Kamer X" labels now come from the room assignments on Event › Kamers
  instead of a separate free-text field.
- Weer and Praktisch open as sheets like the other tiles, instead of unfolding
  and pushing the page down. Uitgave toevoegen, expense details and the
  settle-up screen are sheets too, and the floating add button is gone.
- Small labels and subtexts are Poppins across the app (the big headlines and
  numbers keep the condensed face), and the Hub's card subtexts are in normal
  case.
- A car with 4 seats or fewer gets a smaller icon; the truck now belongs to a
  specific member's account instead of a name match.
- Cosplays hold at most three images.
- Event covers, badge images and profile banners are now stored in MinIO,
  next to story photos and cosplay images. Images uploaded earlier stay in
  Supabase Storage and keep working.
- The Hotel sheet is ordered info, rooms, the "nog geen kamer" notice, then the room count with the
  Bulk and Kamer buttons.
- In the Hotel sheet, "N deelnemers hebben nog geen kamer" expands to show their names.
- **Kamers is now Hotel.** The tile and sheet show the hotel's address, the stay (first to last
  night), who arrives late or leaves early, the hotel notes (check-in and check-out times,
  breakfast…) and then the rooms. The tile shows the address too.
- **The admin panel uses the same bottom sheets as the rest of the app** instead of a
  right-hand drawer, including the "unsaved changes" confirmation.
- **Anyone can sign others up** for meals, rides, restaurant cars, trip days and hotel
  rooms: "Iemand aanmelden" now works for every member, and the name pickers offer all
  names. Who paid, location pings and cosplays stay with their owner.

### Added
- **Voor jou** on the Hub lists everything you still need to arrange, and
  each item opens the place where you fix it. It replaces the Acties page.
- Vervoer and Eten show who on the trip still has no ride or meal; tap the
  "zonder rit" or "nergens bij" pill on the tile to see who.
- Expenses can be linked to an event, and Financiën can be filtered per trip.
- Anyone's full profile can be opened from their profile popup.
- **Afrekenen** in Financiën: one payment per person instead of one per
  expense. What you and another member owe each other is netted over all
  expenses into a single amount (migration v2.25).
  - The one who's owed pastes a payment-request link from their bank app
    (Tikkie, bunq, PayPal, Revolut, Klarna, or ING, Rabobank, ABN AMRO, SNS,
    ASN, RegioBank, Knab) and/or an IBAN; the other gets a Discord DM and
    pays with one tap, then taps "Ik heb betaald". Links to other sites are
    refused.
  - The receiver confirms it arrived, which settles every share it covered,
    or says it didn't, which reopens them. Cash can be marked as received
    straight away.
  - Bank details are only shown to the other person, are never stored on a
    profile, and are wiped once the payment is confirmed.
  - Payment requests and payments to confirm show up in Voor jou.
  - An admin can no longer delete an expense, or change a share's status,
    while it's part of a settlement that isn't confirmed yet.
- **Car loading advice** on Vervoer (Heen and Terug): every car shows how many people it
  should leave with so nobody is left behind, and later cars compensate when an earlier
  one leaves light. Advice only; it updates live with the sign-ups.
- **Search** in the top bar: one search over trips, rides, meals, cosplays and
  crew, using what the app already has.
- **Profiles list a member's photos**, newest first, with a filter per event
  and a viewer. Photos uploaded under a former name still count.
- **Admin → CDN** shows every file in the photo bucket, newest first, with
  its uploader where known, so nothing unwanted goes unnoticed.
- **Admin quick upload:** the CDN page has an "Uploaden" button that stores an
  image or video (MP4, MOV, WebM up to 80 MB) and returns a link to copy. Files are
  checked by what they really are, and land under `uploads/` (shown as its own
  filter).
- Admin → Schermen testen previews the crash, unreachable, forbidden, 404 and
  "waiting for connection" screens.
- **Drivers can take a ride back:** "Ik rijd" becomes "Rit verwijderen" once
  you already drive that direction, with a warning if others have joined.
- Story photos that can't be sent (no signal) are kept and sent automatically
  when the connection returns, even after closing the app. Cosplay images are
  retried while the form is open.
- New expenses pre-select the event nearest to today, and the event list only
  goes back two months.
- Uploaded images are cached by browsers for a year, so a photo already seen
  never downloads again.
- Credits (ALFA, RG Digital, Ankerd) in Instellingen.
- **Admins can delete files from Admin → CDN**, whoever uploaded them. Open a file and use the
  bin; the story photo, cosplay image, banner or event cover that used it loses it too.
- **Installation guide** (`docs/installation.md`): every `.env` value and where to find it
  (Supabase, Discord, Google, MinIO), running in Docker or Portainer, the reverse proxy, and the
  first login. Comes with a root `Dockerfile` (frontend and backend in one image) and a
  `docker-compose.yml`.
- **Admins get a pencil on event pages** (next to Share) that opens the event's edit form
  right there.

### Removed
- The payment references ("ANKERD-014", "AFR-003"): nothing used them (migration
  v2.27).
- The Acties page, the Meer tab, the separate story archive and the admin
  "Hotelkamer" field on users. Old links redirect to the new pages.

### Security
- Logging in can no longer be used to take over someone else's account. The
  backend now identifies you only by what Supabase verified during the
  Discord or Google login, never by details a user can edit themselves.
  - A profile an admin created ahead of time is only linked to a Discord
    account on the whitelist.
- Members can only sign themselves up or off (meals, rides, restaurant cars,
  trip days, hotel rooms), post their own location and log expenses they
  paid. Admins can still do this for anyone. Name pickers only show names
  you're allowed to pick.
- Only the creator (or an admin) can delete a meal, cosplay, expense or
  payment. Only the person who owes a share can mark it as paid, and only
  the payer can confirm it.
- Links on meals, events, cosplays and badges must be http(s). A plain
  domain like `www.pizzeria.nl` gets `https://` added. Older links that
  aren't http(s) are no longer clickable.
- Uploaded photos lose their metadata, including where they were taken, and
  a file has to really be an image to be accepted.
- Browsers can no longer read or change the database or storage directly;
  everything goes through the backend. Event covers and badge images are
  uploaded through the backend too.
- The Agenda subscription link now contains a secret. Existing calendar
  subscriptions stop updating: subscribe again from Agenda → Abonneren.
- Discord messages can't ping `@everyone` or anyone else through text
  members typed.
- Admins can no longer log in as another admin, and every "log in as" is
  logged.
- You can't rename yourself to, or add as an alias, a name that belongs to
  someone else, including their former names.
- The app sends security headers, including a Content Security Policy that
  limits where scripts and connections may come from.
- The API documentation is off unless `API_DOCS_ENABLED` is set, the
  public list of member names is gone, and too many requests from one place
  get a "wait a moment" (429) instead of being served.
- An old database trigger that gave every new login a profile, skipping the
  whitelist, is removed (migration v2.23).
- A first Discord login only takes over a placeholder profile an admin made
  (no Discord account, no email) whose name is exactly the Discord username.
  New profiles always get a name nobody uses, including former names, and
  the database refuses two profiles with the same name.
- Deleting a user also removes them from the whitelist, so they can't just
  log in again.
- Bulk-adding hotel rooms is capped at 100 per request, and a new room only
  lists yourself unless you're an admin.
- Logging out while "logged in as" someone ends that session too, and an
  expired "log in as" session ends instead of switching to the admin's own
  account. Signing out elsewhere also clears the data saved on this device.
- Login uses the PKCE flow, so tokens no longer appear in the URL.
- Updated FastAPI, Starlette, python-multipart and Vite to versions without
  known denial-of-service bugs, and replaced python-jose with PyJWT.
- The backend `Dockerfile` leaves out `.env` and runs as a normal user instead of root (the
  Portainer stacks use the stock Python image and still run as root).
- Link previews (Discord, WhatsApp, …) of an event show only its name, date
  and cover image; the location and description stay behind the login.
- Oversized uploads are refused before they're received, the rate limit only
  trusts forwarded IP addresses from the proxy (and covers link previews),
  and text members write is shown literally in bot DMs, so it can't hide a
  link behind other text.

### Fixed
- Saving an expense failed whenever the payer was among the people splitting it,
  and a failed save left an empty bill behind.
- Uploads no longer freeze the whole app when MinIO is slow: they run off the
  main thread, MinIO calls time out, and the app gives up on a request after
  30 seconds (uploads 60) instead of hanging.
- Real logins are verified locally again, so a dropped connection to Supabase
  no longer logs people out; it answers 503 and the app retries.
- A profile popup taller than the screen (long bio, many events) scrolls
  instead of running off the bottom.
- A page that fails to load points to status.ankerd.org.
- Shared trip links get a preview again (name, cover and date).
- Financiën: the payer's own share of an expense counts as paid from the
  start, instead of showing up as money they owe themselves. It's shown as
  "Eigen deel".
- An even split no longer loses cents: €10 over three people is 3,34 + 3,33
  + 3,33, with the extra cent going to the payer first.
- The payer can mark a share as received without waiting for an "Ik heb
  betaald", for cash handed over in person.
- An expense can only be saved once it's split between people and the
  shares add up to the bill exactly (Vast and Handmatig used to allow a
  difference). The form says what's still missing, and "Verdeling" no
  longer says "optioneel".

---
- Signing up at the same moment as someone else (a meal, a ride seat, a trip day, a hotel room, a
  restaurant car) can no longer wipe out the other person's sign-up, or let two people take the
  last seat. The change is retried on the latest list instead (`app/core/atomic.py`).
- **Event reminders (a week before, the day before, the day itself) were never sent**: the daily
  job crashed on every event. They work again, and they and the ticket-sale reminders now go by
  Dutch time instead of the server's (UTC), so a ticket sale is announced when it opens and not two
  hours late. A sale that opened long ago is no longer announced.
- Signing someone up (meal, ride, restaurant car, trip day, hotel room) now needs a name that
  belongs to a member, so a made-up name can no longer fill a ride or a room.
- A new expense's default date no longer flips to yesterday between midnight and 02:00, and
  the Hub's countdown and the changelog's default date follow the app's clock and Dutch date.
- Closing the Vervoer sheet while making a ride no longer leaves it on that form: it reopens on
  the ride list.
- The "add a room" and "rooms in bulk" forms opened behind the Hotel sheet. They are now sheets
  stacked on top of it, and profile popups opened from a sheet also appear above it.
- The Eten tile no longer says "Straks 21:45" for a meal that is days away; it shows the day and
  time (e.g. "zo 21:45") unless the meal is later today.
- On the trip ticket, the "Je gaat mee" stamp no longer sits on top of "Iemand aanmelden".

## [1.5.0] - 2026-09-02

### Added
- Quick-ride tiles on the Hub for offering or finding a ride to/from the
  hotel, and a matching pair for restaurant outings — both open a minimal
  popup instead of the full ride form.
- Restaurant rides can now be organized and joined directly from the linked
  meal's detail page, without needing to open the separate ride page.
- Notification category preferences added as a new onboarding step, all off
  by default.
- Admin-only time-travel widget for testing time-dependent features without
  waiting for the real clock.
- Admin-only "log in as user" tool, mainly for guest profiles that have no
  Discord account of their own.
- Admins can now change a payment's status directly, delete a transaction,
  and link a payment to a specific event; settled payments automatically
  move into a collapsible history section grouped by event.
- New changelog system: a dismissible "what's new" banner plus a full
  history page (**Meer → Wat is nieuw**), with an admin page to manage
  entries.

### Changed
- New main event card, including a carousel for upcoming events.
- The driver now always counts as one of their own car's seats (a new ride
  starts at 1/5, not 0/5), and every "how many seats" prompt defaults to 5.
- Ride and restaurant cards in the Transport tab are now clickable anywhere
  on the card, not just via a small "Details" link, with a clearer hover
  effect.
- Ride locations that match a linked event's venue or hotel address now show
  as "the event name" / "Hotel" instead of a raw street address; a
  destination that hasn't been filled in yet is shown as a muted placeholder
  instead of looking like real data.
- Restaurant ride prompts now say "Route toevoegen" instead of "Rit
  toevoegen", since nothing is a real ride until someone signs up as driver.
- Clarified that adding a guest user (no Discord ID) is fully supported from
  the admin panel — reworded the help text so it's no longer implied every
  account will eventually log in.
- Linking a meal to a restaurant route now only links it — it no longer
  silently overwrites the departure time, location, and parking info you
  already typed in. The location field is now always labeled "Vertrekpunt"
  so it's clear it's the starting point, not the restaurant's address.

### Fixed
- Meals created through the admin panel stored only a bare time-of-day
  value instead of a full date and time, which silently broke every
  time-dependent meal feature (including the new quick-ride tiles).
- A quick-created ride showed the creator's account UUID instead of their
  display name.
- Rides created through the admin panel never added the driver as a
  passenger, unlike the same action taken by a regular user.
- A restaurant ride's destination showed the literal word "Bestemming"
  instead of an address, since there was no destination field for that
  direction — it now shows the linked meal's actual location.


## [1.4.0] - 2026-06-25

### Features

- **Profile banner upload** — Users can now upload a banner image (JPEG, PNG, WebP, or GIF) from their profile settings. A drag-and-zoom crop modal lets users reposition and scale the image to fit the 3:1 banner aspect ratio before uploading. GIFs are uploaded as-is to preserve animation. Banners are stored on Supabase Storage CDN and capped at 8 MB. Uploaded banners appear in the profile header, the view-only profile card, and the user profile popup. Existing banners can be replaced or removed at any time.

- **Hub page redesign** — The Hub page has been fully redesigned with a SaaS dashboard aesthetic. It now features a personalised time-based greeting with the current user's avatar, a dark event card with countdown and participant stack, a 2×2 action grid with live counters for rides, meals, finances, and location, and an improved hotel room overview with stacked avatars grouped by room.

- **Calendar list/calendar toggle in Meer** — The upcoming events section in the Meer tab now combines the list view and the full calendar grid into a single component with a segmented toggle. Both views share the same height so switching between them produces a smooth opacity transition without layout shift. The list view includes pagination (5 events per page) with dot indicators and prev/next arrows.

- **NamePicker shows Discord avatars** — The name picker dropdown now displays each user's Discord profile picture (via `UserAvatar`) instead of a hardcoded initial with a colour block. Chips inside the picker also show the avatar.

- **NamePicker: show on type only** — The name picker dropdown no longer opens immediately on focus. It only appears once the user starts typing, keeping the UI clean for lists with many users.

- **NamePicker in transport modal driver field** — The ride creation modal's driver field has been replaced with `NamePicker`, making it consistent with all other name selectors in the app.

- **Public transport driver icon** — Ride cards for public transport routes now show a Train icon in the driver row instead of a `UserAvatar`, since "NS" is not a real user.

### Bug Fixes

- **Banner crop zoom drift** — Rapidly dragging the zoom slider caused the image to drift to a corner of the crop viewport. The root cause was a stale `zoom` state value being read inside `applyZoom` on each slider event before React had re-rendered. The current zoom is now tracked in a ref that is updated synchronously on every call, so position scaling is always relative to the correct previous zoom level.

---

## [1.3.0] - 2026-06-24

### Bug Fixes

- **Meal RSVP broken** — `rsvpMeal` in `meals.service.ts` referenced an undefined `api` variable instead of `apiClient`. All three meal mutations (`rsvpMeal`, `cancelRsvp`, `deleteMeal`) also still used `rowNumber: number` as the identifier, while the Supabase backend expects a UUID string. All three are now fixed.
- **Payments broken** — The `Payment` model in the backend still had `row_number: int` as its primary key field. Supabase returns `id` (UUID string). The backend model, frontend type, service, hook, `PaymentCard`, and `FinancePage` key prop were all updated to use `id: string`.
- **Restaurant rides non-functional** — `RestaurantCard` passed `rowNumber: ride.row_number` to all nine mutation calls, but `row_number` no longer exists on the `Ride` type (migrated to `id`) and the hooks expected a field named `id`, not `rowNumber`. All calls corrected to `id: ride.id`.
- **Hub page crew section never loaded** — `HubPage` called `useUser()` (a single-user hook requiring a name argument) instead of `useUsers()`. Because no name was passed, the query was permanently disabled and the crew section never populated.
- **ICS export broken** — `exportRideToIcs` and `exportMealToIcs` in `ics.ts` referenced `ride.row_number`, `meal.row_number`, and `meal.rsvps`, none of which exist on the migrated types. Updated to `ride.id`, `meal.id`, and `meal.participants`.
- **`RideTimeline` and other components** — Several components still used `ride.row_number` or `gap.rowNumber` as React list keys (`RideTimeline`, `RestaurantStatus`, `DailyActionCheck`, `ComputeRestaurantGap`). All corrected to use `id`.
- **Backend `IndentationError` on startup** — Removing the `row_number` field from `models/user.py` accidentally de-indented the `phone_number` field below it, causing a Python `IndentationError` that prevented the server from starting.

### Features

- **Allowlist (change #27)** — Only Discord users with an existing profile row in Supabase can access the app. After Discord OAuth validation, `get_current_user` in `dependencies.py` now queries the `profiles` table and returns `403 Toegang geweigerd` if no profile is found. To grant someone access, add them to the `profiles` table in Supabase.

- **Hotel room tile on Hub (change #28)** — When the active upcoming event has `is_hotel: true` and at least one user has a hotel room set in their profile, a "Hotelkamers" tile appears on the Hub page. Users are grouped by room number with their avatars shown alongside.

- **Automatic version number (change #29)** — The app version shown in the Meer tab is now sourced automatically from `frontend/package.json` at build time. `vite.config.ts` reads the version and exposes it as a global `__APP_VERSION__` constant (declared in `vite-env.d.ts`). To bump the version, update the `version` field in `package.json` — the Meer tab will reflect it on the next build without any manual edits to UI files.

- **UserAvatar used everywhere (change #22)** — All places that previously rendered avatars with hand-written `avatarColor()` + initial divs have been replaced with the `<UserAvatar />` component. This ensures custom profile colors set by users appear consistently across: `PaymentCard`, `RideTimeline`, `MorePage` crew strip and crew list, `HubPage` hero participant bubbles, and `RestaurantGapBlock`. The component was already in use in `CalendarGrid` and `CalendarArchive`.

- **Name picker in payment delete modal** — The raw `<select>` dropdown in the payment deletion confirmation modal has been replaced with the `NamePicker` component, making it consistent with every other name selector in the app (searchable, styled the same way).

- **UUID IDs for rides and calendar tables** — The `rides` and `calendar` Supabase tables previously used auto-incrementing integer primary keys. All backend route parameters (`ride_id`, `event_id`), Pydantic models, frontend TypeScript types (`Ride.id`, `CalendarEvent.id`, `CalendarEvent.event_group_id`, `RestaurantGap.id`), hooks, and services have been updated to treat these IDs as `string` (UUID) to be consistent with the `meals` and `payments` tables. The actual Supabase schema change (dropping the identity constraint and altering the column type to `uuid`) must be applied via the SQL editor.

### Code Cleanup (change #23)

- **Google Sheets completely removed** — The following files were deleted as they were dead code left over from the original Google Sheets integration:
  - `backend/app/core/sheets.py`
  - `backend/app/services/sheets_service.py`
  - `backend/app/routers/auth.py` (passcode-based login, never imported in `main.py`)
  - `backend/app/services/auth_service.py`
  - `backend/tests/` (entire test suite was built around Google Sheets mocks and no longer applied)
- **`requirements.txt` cleaned up** — Removed `gspread`, `google-auth`, and `pandas`, which were only needed for the Sheets integration.
- **`main.py` lifespan updated** — Startup no longer attempts to connect to Google Sheets. It now performs a lightweight Supabase connectivity check instead.
- **`config.py` cleaned up** — Removed the broken `google_service_account` property that referenced a non-existent settings field.
- **`models/user.py`** — Removed the stale `row_number` field.
- **`types/index.ts`** — Removed `row_number` from the `User` interface and `RestaurantGap` interface; cleaned up `// was row_number` comments.
- **Stale comments removed** — Leftover `// CHANGED: ride.row_number is now ride.id` and similar migration comments removed from `RideCard.tsx` and `MealCard.tsx`.

### Row Number → ID Migration (change #25)

All remaining `rowNumber` / `row_number` references across the frontend have been replaced with the correct Supabase `id` field:

| Area                                          | Before               | After        |
| --------------------------------------------- | -------------------- | ------------ |
| `FoodPage` list keys                          | `meal.row_number`    | `meal.id`    |
| `FinancePage` list keys                       | `payment.row_number` | `payment.id` |
| `usePayments` hook                            | `rowNumber: number`  | `id: string` |
| `useCalendar` hook                            | `rowNumber: number`  | `id: string` |
| `calendar.service.ts`                         | `rowNumber: number`  | `id: string` |
| `CalendarGrid` / `CalendarArchive` prop types | `id: number`         | `id: string` |
| `MorePage` calendar callbacks                 | `rowNumber`          | `id`         |

---

## [1.2.0] - 2026-06-22

### Features

- **Ride expiry states (change #1)** — Rides are now colour-coded based on departure time: urgent (red, <30 min), soon (orange, 30–120 min), recently departed (grayed out, 0–2h after departure), and fully expired (hidden). Expired rides are shown only in the history view.
- **Ride history button (change #1b)** — A history toggle on the Transport tab shows rides that departed more than 2 hours ago.
- **Timo truck easter egg (change #2)** — When the driver's name starts with "Timo", a truck icon replaces the car icon on their ride card.
- **Seat label updated (change #3)** — "Zitplaatsen" replaced with "Meerijders welkom" to make it clearer the count refers to available passenger spots, not total seats.
- **Upcoming event banner in Meer (change #4)** — The next upcoming event is always shown at the top of the Meer tab below the location ping button.
- **Expandable participants on Hub (change #6)** — The participant avatar strip on the hub hero card is now tappable and expands to show all participant names.
- **Searchable name dropdowns (change #7)** — All name dropdowns now use the `NamePicker` component, which supports typing to filter through names.
- **Seats field hidden for public transport (change #8)** — When "Openbaar Vervoer" is selected when creating a ride, the seat count field is hidden.
- **Restaurant rides (change #5)** — A dedicated "Restaurant" direction for organising transport to restaurant outings, with car availability and action-required flags.
- **Dark mode (change #11)** — User-controlled dark mode toggle in the Meer tab, persisted to `localStorage` via `useThemeStore`.
- **Chronological event ordering (change #12)** — Events in the Meer tab calendar are now sorted chronologically.
- **Calendar RSVP (change #13)** — Users can sign up to events directly from the Con Calendar in the Meer tab.
- **Past events hidden (change #14)** — Completed events are collapsed under a "Geschiedenis" section in the Meer tab.
- **Events grouped by Event ID (change #15)** — Calendar entries are grouped by their Event ID (e.g. HDCC2026Zomer) rather than listed individually.
- **Hub: future-only counters (change #17)** — The rides and meals counters on the Hub now only count upcoming items, not past ones.
- **Food: past meals collapsed (change #18)** — Completed meals are hidden under a collapsible history section.
- **Meals always expanded (change #20)** — Meal cards now start expanded by default.
- **Location ping tile (change #21)** — The Hub stat grid now features a prominent location ping button instead of a member counter.

### Fixes

- **Timezone handling (change #9)** — `formatDate()` now parses `DD-MM-YYYY` and `YYYY-MM-DD` date strings as local midnight to prevent off-by-one date display issues caused by UTC conversion.

---

## [1.1.0] - 2026-06-10

### Features

- **Supabase migration** — Database migrated from Google Sheets to Supabase (PostgreSQL). All read/write operations rewritten to use the Supabase client.
- **Discord OAuth login** — Authentication replaced with Discord OAuth via Supabase Auth. Users log in with their Discord account; their Discord display name is used as their in-app identity.
- **Profile customisation** — Users can set a custom avatar colour, profile banner colour, bio, pronouns, and display font from the profile page.

---