# Features

What each part of the app does, the rules that are easy to miss, and where the
code is. Paths are relative to `frontend/src/` unless they start with `backend/`.

- [Navigation](#navigation)
- [Hub](#hub)
- [The trip page](#the-trip-page)
- [Transport](#transport)
- [Food](#food)
- [Hotel rooms](#hotel-rooms)
- [Cosplay](#cosplay)
- [Photos and stories](#photos-and-stories)
- [Finance](#finance)
- [Agenda](#agenda)
- [Crew and profiles](#crew-and-profiles)
- [Search](#search)
- [Notifications](#notifications)
- [Onboarding, settings and the changelog](#onboarding-settings-and-the-changelog)
- [Admin panel](#admin-panel)

---

## Navigation

Five places: **Hub · Event · Agenda · Financiën · Crew**. Phones get a bottom tab
bar (`components/layout/BottomNav.tsx`), tablets an icon rail, desktop a sidebar
with the next trip as a wristband (`Sidebar.tsx`). The top bar (`Header.tsx`)
carries the page name, search, the time-travel icon (admins) and the account
menu; a page can hand it an action with `HeaderAction` (the trip page's share
button). Personal settings (notifications, Discord, theme, greeting) are under
**Instellingen** in the account menu.

**Event** opens the *current* trip. Old paths (`/transport`, `/food`, `/more`,
`/members`, …) redirect to their new homes, so bookmarks and shared links keep
working (`router.tsx`, `config/routes.ts` → `legacy`).

## Hub

`pages/HubPage.tsx`. From the top (on a phone, "Voor jou" comes straight after the trip, before the meal and ride shortcuts; from `xl`
the trip is the left column and "Voor jou" with the shortcuts the right one):

- **Story row**: an "add" tile and a ring per day with photos, unseen ones highlighted. It only shows
  once a day has photos or the trip is a day away; weeks before, it would be empty circles.
- **Upcoming trip ticket** (`components/hub/UpcomingEventCard.tsx`): the nearest
  trip with a countdown, its days and who is going. More than one upcoming trip becomes a
  carousel (`UpcomingEventsCarousel.tsx`): swipe it or use the dots (`Pager`; the arrows show from `md`).
  It never moves by itself.
- **Today's meals** (`MealTodayCard.tsx`) and **quick ride tiles**
  (`QuickRideTiles.tsx`): offer or join a ride to/from the event or hotel. The
  direction and time are guessed from the clock (`utils/quickRide.ts`).
  One grey line above the two tiles says what the sheets open on. "Meerijden" is the same day chips and Heen/Terug rows as the Vervoer sheet (`JoinRideModal.tsx` reuses
  `RideRow`). Where a new ride starts and ends is `defaultRideEnds` (`utils/rideLocations.ts`),
  shared with the Vervoer sheet: the venue on the event side and, on a hotel trip, the hotel on
  the other side except for the first Heen and the last Terug (those are from and to home).
- **Mijn ticket shortcut** (`TicketShortcutCard.tsx`): one tap to the current trip's ticket
  sheet, reading straight from the same on-device store as the event page's tile — its text
  changes depending on whether you've saved one yet. The link (`?openTicket=1`) is a one-shot
  flag the trip page consumes and strips, not a real deep link — there is nothing server-side
  for it to point at.
- **Voor jou** (`ForYouPanel.tsx`, `utils/actionItems.ts`): everything you still
  have to arrange: a trip day without a ride, a restaurant without a car, expenses
  to settle, payment requests and payments waiting for your confirmation. Each item
  opens the place where you fix it.
- **Location ping**: tell the group where you are (see [Crew](#crew-and-profiles)).

## The trip page

`pages/trip/`. One page per trip at `/trips/:tripId`; `tripId` is the trip's
`multi_day_id`, or the day id for a single-day event (`utils/trips.ts`).

- The **ticket** (`components/trip/TripTicket.tsx`) shows the trip, its days, who
  is going and a countdown. Tap a day to sign up or off. Tap the avatars to see
  everyone by name (`TripParticipants.tsx`); that list has the "Iemand aanmelden" button (it sits next to the text
  when nobody is on the trip yet). The tilted "Je gaat mee" stamp is only on a trip that is under way or over; before it,
  the checked day cards and "Jij en 3 anderen" say it.
- The line at the top of the ticket names what kind of trip it is: an admin can tag an event
  **Con**, **Gathering** or **Concert** (`events.event_type` — Admin → Evenementen); untagged
  falls back to "Con" when the trip has con programming (`has_con`) or "Reis" otherwise. Shown
  the same way in the Agenda ticket and the Hub's upcoming-trip card.
- A calendar button in the top bar, and "Andere evenementen" under the tiles, open a list of every
  trip to jump to another one (`TripSwitcher.tsx`); on a phone you can also swipe sideways to the
  next or previous trip (`hooks/useSwipe.ts`) — a one-time pill (`SwipeHint.tsx`) points this out
  the first time a device lands on a page it can actually swipe on, then never shows again (or
  the moment a real swipe happens, whichever comes first). The ticket and tiles slide and fade in
  the direction swiped (`tripSlideVariants` in `TripOverviewTab.tsx`), so it's clear something
  moved and which way, not just a sudden swap. Admins also get a pencil to edit the event.
- Below it, a **tile** per part of the trip (`TripTiles.tsx`): Vervoer, Eten,
  Hotel (hotel trips only: address, arrivals and departures, rooms; the dates of the stay are in the sheet's subtitle), Foto's, Cosplay (trips with a convention), Weer,
  Info (opens the Praktisch sheet), Kosten and Ticket (opens Mijn ticket); the tile labels are
  short so they fit. Tiles show the answer ("6 rides, 3 people without a ride
  back") and their order changes before, during and after the trip. The amber "zonder rit" and
  "nergens bij" pills open the names of who is missing (a sheet, `MissingPeopleSheet`).
- Tiles open as **sheets** over the page (`TripSheet.tsx`). Vervoer, Hotel and
  Cosplay are routed with `?sheet=transport|rooms|cosplay` so they can be linked;
  Weer, Praktisch and Eten's "add meal" open from local state.
- **Mijn ticket** (`TicketTile`/`TicketSheet` in `TripTiles.tsx`) lets a member save a photo or
  PDF of their own event ticket — kept entirely in this browser's IndexedDB
  (`utils/localTickets.ts`, `store/localTickets.store.ts`), never uploaded anywhere. Deliberately
  not in the shared photo bucket or the database: nobody else can see it, not other members and
  not admins, and there is nothing server-side to secure. The trade-off is the flip side of
  that — it doesn't sync to another device and a browser can clear it on its own, so it's a
  convenience, not a permanent archive. Not the same "ticket" as an event's `ticket_url` (where
  to buy one) — that stays under Praktisch.
- Multi-day trips get **day chips** to filter by day.

## Transport

`pages/trip/TripTransportTab.tsx`, `components/transport/`, `backend/app/routers/rides.py`.

- **Heen** (inbound), **Terug** (outbound) and **Restaurant** rides. A ride has a
  driver, seats, a departure time, a start and end location and optional parking
  info. Public transport has no seats.
- **The Vervoer sheet** shows one day at a time, with three sections under each other:
  **Heen**, **Terug** and, when the trip has a meal, **Eten** (each a small label with its number of
  rides and, for Heen and Terug, its own "Rit aanbieden"; the people without a ride are named in those sections, not in a list of their own). On a multi-day trip day chips pick the
  day (an amber dot marks a day that still has people without transport). Each ride is a
  single row (time, driver, where from or to, seats free and the car's target); tap it for
  who rides along, the parking info, **Stap in** / **Uitstappen** and a link to the ride's
  own page. **Your own ride is the blue row.** Under the Heen and Terug headers a line names the
  drivers who planned the other way but not this one ("Nog geen terugrit: Anna, Bram"), for the
  whole trip, so on the way back nobody has to go through every driver to see who is still missing
  (`driversMissing` in `utils/transportView.ts`). The sheet opens on the day, and scrolls to the section, the
  Hub's "Rit aanbieden" and "Meerijden" tiles would use (`utils/transportView.ts`, built on
  `planQuickRide`): Heen before the trip and in the morning, Terug from 13:00, Heen on
  tomorrow's day from 20:00, Terug on the last day once it's over, and Eten instead of Terug
  when the trip has no hotel and a meal still to come needs a ride. That is only the starting
  point; it never moves while the sheet is open.
- The driver counts as a passenger; "seats" are the seats for others. Claiming and
  leaving a seat work for anyone, see [acting-for-others.md](acting-for-others.md).
- **"Rit aanbieden"** (next to the day chips, Heen and Terug only) is gone once you already
  drive that direction that day; the ride itself then offers **"Rit verwijderen"**. It asks
  to confirm and warns when others have joined. `DELETE /api/rides/{id}` is for the driver
  or an admin.
- **Restaurant rides** are created from a meal that needs transport and can have
  several cars, each with its own seats (`RestaurantRideGroup.tsx`, `CarCard.tsx`).
- **Car loading advice** (Heen and Terug, per day): from the number of people signed up for
  that day and the cars offered, each car shows how many it should leave with so nobody is
  left behind (`utils/carBalance.ts`). Cars go in departure order; whatever an early car
  leaves without, the later ones have to take. With 11 people and three 5-seaters the first
  should take 3–4; if it leaves with 2 the second needs 4–5; if that one leaves with 4 the
  third has to be full. Each row shows the target ("doel 3–4", amber when the car is short,
  green when it's on course) and the open ride the full pill ("Nog 1 nodig · doel 3–4", "Op
  schema"), and the direction shows people, cars, seats and who has no car yet or how many
  seats are short.
  It is live advice from today's sign-ups and never blocks anyone: cars rarely leave on
  time, so nothing is locked in. Public transport and cars that left over two hours ago are
  left out.
- An open ride shows a countdown pill as departure nears; a ride stays
  visible for two hours after it leaves, then moves to the history
  (`utils/rides.ts` → `getRideStatus`).
- The vehicle icon comes from `rideVehicleIcon`: a train for public transport, a
  truck for one specific member (by profile id), otherwise a car, drawn smaller for
  4 seats or fewer.

## Activities (food, bowling, the group photo)

`components/food/`, `components/meal/`, `backend/app/routers/meals.py`. An activity has a
time, location, cost, dietary notes, links, whether it needs transport, and
participants. It started as the meal ("etentje"), so code, API and the `meals` table keep
that name; the app calls it an **activiteit**. Anyone can plan one for a trip
(`TripMealSheet.tsx`); only its creator or an admin can edit or delete it, both from the pencil on
its page (`MealEditSheet.tsx`; deleting asks first and also removes the ride to its restaurant,
which has no meaning without it). The
**Activiteiten** tile lists the next ones, and its "nergens bij" pill opens the names of the
members who are not at any *meal* yet.

- **Soort (category).** Each activity has a category (Eten, Activiteit, Groepsfoto, Spel,
  Con, Concert, ...) from the `meal_categories` table. Admins manage them under
  Admin → Activiteiten → Categorieën: add, rename, reorder (the top one is preselected) and
  delete (refused while activities still use it). The backend sends a category along with each
  activity (`Meal.category`), so no screen needs a second request, and an activity without one
  behaves as before (`FALLBACK_CATEGORY` in `utils/mealCategory.ts`).
- **What a category has**, as four switches: *Aanmelden* (the Aanmelden/Afmelden buttons and the
  list of who is going), *Prijs* (a price per person), *Vervoer* (the "Vervoer regelen" switch,
  and so a ride) and *Telt als eten* (dietary wishes, and "nergens bij"). The create and edit
  sheets and the detail page show only what the category has. The group photo has none of them:
  just a time and a place.
- No maximum number of spots and no sign-up deadline, on purpose.
- The Vervoer sheet's third section is called Activiteiten and lists every activity with a car.

## Hotel rooms

`pages/trip/TripRoomsTab.tsx`, `backend/app/routers/calendar.py`. Rooms belong to
the trip's parent event. A room may exist before it has a number (hotels assign
numbers at check-in) and can have a capacity, so rooms can be created in bulk
("10 rooms of 2") and self-assignment stops when a room is full. "Kamer X" labels
elsewhere come from these assignments (`hooks/useTripRooms.ts`).

## Cosplay

`pages/trip/TripCosplayTab.tsx`, `components/cosplay/`, `backend/app/routers/cosplays.py`.
A cosplay is a character (and series) worn by a member on one or more days of a
trip, with **at most three** reference images (a link, or an upload). The sheet has
a list, a filter (person, day, sort), a detail view and the create form, all
inside one `TripSheet`. An image that cannot be uploaded is kept and retried while
the form is open; saving waits until nothing is queued.

## Photos and stories

`components/story/`, `backend/app/routers/stories.py`.

- Anyone can add photos to a day, from the Hub, the trip ticket or the Foto's
  tile. Each is compressed in the browser (max 2560 px, JPEG 88 %), checked by the
  backend and stored in MinIO.
- **Lighter copies, so it does not eat mobile data.** The original is up to 2560 px and easily a
  megabyte; a grid of nine would be ten megabytes for pictures shown 100 px wide. When a photo is
  uploaded the backend (`app/core/thumbnails.py`) also stores two WebP copies next to it: a **thumbnail**
  (480 px) for grids, the story ring and profiles, and, for a photo bigger than about 1500 px, a **preview**
  (1280 px) for the story viewer and the lightbox. A video's thumbnail is made from its still frame.
  The **original is never touched**: Download, the day's zip and Delen still use the full file. Which file
  goes where is decided in one place, `utils/storyMedia.ts` (`gridImage`, `fullImage`); photos added
  before this existed have no copies and show the original until the backfill has made theirs. Deleting a
  photo (yourself, or an admin on the CDN page) deletes its copies too, and the CDN page does not list them
  as files of their own. Needs migration v2.41 (without it photos are still taken, just without copies).
- **Several at once** (`hooks/useStoryPhotoPicker.ts`, shared by both entry points): up to
  30, uploaded one after the other, **oldest first by when they were taken**. The story shows
  upload order, so uploading in capture order is what sorts them. The date is the EXIF
  `DateTimeOriginal` (`utils/photoDate.ts`), read from the original because the canvas
  compression strips EXIF, with the file's `lastModified` as fallback. One toast sums up the
  batch; after a network failure the rest is queued without waiting out more timeouts.
- **Videos** (MP4, MOV, WebM, up to 80 MB) go in the same story. The phone makes a still frame of
  the video (`utils/videoPoster.ts`; a dark frame if the browser cannot decode it) and sends both;
  the server checks the bytes really are a video, stores the file untouched (no re-encoding, no
  ffmpeg) and the frame next to it (`story_photos.poster_url`, migration v2.40). The frame is what
  grids, the story ring and profiles show, with a small play badge. In the viewer a video plays
  with sound when the browser allows it (otherwise muted, with a speaker button), its progress bar
  follows the video and the story moves on when it ends. A video is **not compressed**: over 80 MB it is
  refused at once (before anything is sent), over 25 MB it asks first ("Grote video": on mobile data
  it can take long and fail) through `askConfirm` / `ConfirmHost` (`store/confirm.store.ts`), and
  declining skips just that video. A video is not queued when the
  connection drops (too big to keep): it fails and can be added again. One that a device cannot
  decode (an iPhone's HEVC on a desktop without the codec) says so and the story carries on; the
  file can still be downloaded.
- A **story** is the day's photos in upload order (`seq`). Each member's progress
  is stored per day (`story_seen`), so a ring shows "unseen" until you have
  watched to the newest photo.
- **A photo that can't be sent is queued**: it is saved in IndexedDB and sent
  automatically when the connection returns (`hooks/usePendingStoryUploads.ts`,
  `store/pendingStoryUploads.store.ts`), even after the app was closed. The upload
  button shows an amber badge with how many are waiting.
- Only the uploader can delete a photo (there is no admin override yet, see
  [TODO.md](../TODO.md)); anyone can download the original, or the whole day
  as one zip (the folder icon in the viewer), streamed while it is built.
- **Swipe down to close** the viewer, Instagram-style — the photo follows the
  finger and the background fades; a long or fast pull closes it, a short one
  springs back.
- **Profiles** list every photo a member has uploaded, newest first, with a chip
  per event and a full-screen viewer (`components/profile/UserPhotos.tsx`,
  `GET /api/stories/user/{id or name}`).

## Finance

`pages/FinancePage.tsx`, `components/finance/`, `backend/app/routers/expenses.py`,
`settlements.py`, `backend/app/services/settle_up.py`.

**Expenses.** One member pays a bill and splits it over people. The split has to
add up to the bill exactly, in whole cents (10 euro over three people is 3,34 +
3,33 + 3,33, the extra cent going to the payer). The payer's own share is settled
from the start. An expense can be linked to a trip, and the page can be filtered
per trip. The form pre-selects the event nearest to today and only offers events
from the last two months on.

**Ritkosten (what passengers owe the driver).** `RideCostsCard` on this page, backed by
`app/services/ride_costs.py` and `app/routers/ride_costs.py`. One simple rule, because it is how
friends settle it anyway: **everyone pays the driver of the first ride they took to the trip.**

1. A driver enters **one amount** for the whole trip: fuel, tolls, parking, everything.
2. It is shared **equally** by the driver and the people who went to the trip in their car. "The first ride
   to the trip" is a person's earliest **Heen** in the app. Someone with no Heen in the app (they came by
   train and were picked up later) pays the driver of the first ride they were a passenger in. Someone who
   drove their own Heen pays nobody.
3. **Switching cars later changes nothing**: whoever you rode with on Saturday or Sunday, you still owe only
   that one driver, one amount, however many rides there were. That is the point of the rule (earlier
   versions shared by distance per ride, which gave drivers long lists of tiny amounts).
4. The driver keeps what does not divide into whole cents, so the shares add up to the amount exactly. A
   driver nobody went with has nobody to ask and shows nothing; a Saturday-only driver is paid only by their
   own first-Heen group (they can enter a higher amount if that is unfair).
5. Rides that are not in the app do not count. It is an **overview, not a ledger**: the driver sees who owes
   what (with a copy button for the amount) and asks for it by Tikkie or a payment request. Nothing is
   booked, so it does not enter the balance or Afrekenen. Passengers see a line "Jij betaalt <driver>". A
   trip appears from its first day until 90 days after its last.

**Afrekenen (settle up).** Instead of paying back every share separately, two
members settle everything open between them in one payment:

1. All open shares between the pair are **netted** into one amount per currency.
2. The one who is owed asks for it by pasting a **payment-request link** (Tikkie,
   bunq, PayPal, Revolut, Klarna, or a big Dutch bank) and/or an **IBAN**, or the
   one who owes says "ik heb betaald".
3. The other gets a Discord DM. The payer taps "Ik heb betaald"; the receiver
   confirms it arrived, which settles every covered share, or says it did not,
   which reopens them. Cash can be marked received straight away.

Bank details are only visible to the two people involved, never stored on a
profile, and wiped when the payment is confirmed. Links outside the allowed
providers are refused, and the database allows one open settlement per pair.
While a share is inside a settlement it cannot be claimed, confirmed or deleted
by hand, by members or admins.

## Agenda

`pages/CalendarPage.tsx`, `components/calendar/`.

- **Upcoming trips** are a stack of tickets to swipe through, with "Ik ga mee"
  (all days at once) and "Anderen aanmelden".
- **Recap** looks back: days of past trips show their photos (grey when you did not
  go), and a past trip opens a look-back with who went and the rides and dinners.
- Past trips are collected as stubs per year.
- **Agenda-link** gives a private `.ics` link for a calendar app ("Kopieer link" or open it in Google Calendar)
  (`GET /api/calendar/feed.ics?token=…`). Change `CALENDAR_FEED_TOKEN` to invalidate
  every shared link.

## Crew and profiles

`pages/CrewPage.tsx`, `pages/ProfilePage.tsx`, `components/crew/CrewMap.tsx`.

- **Crew** is the member directory plus **"Waar is iedereen"**: a Leaflet map of
  fresh location pings, plus — always, not only when someone's shared a position — the
  current trip's con location, hotel and each dinnerplan, as their own round pins (a
  glyph instead of an avatar). Pins within 20 m of each other share one marker, e.g. two
  dinnerplans at the same restaurant.
- A **location ping** is a zone or text and, when you allow it, GPS coordinates,
  stored on the profile and considered fresh for two hours. Pings within 20 m of each
  other share a pin.
- A venue pin's coordinates come from `app/services/geocoding_service.py`'s `resolve_location()`,
  server-side, whenever the location is saved: a Google Maps link, if given, wins (its own
  coordinates are extracted directly from the resolved URL — the exact spot a member picked,
  not a guess from a name), otherwise the location text is geocoded via Nominatim/OpenStreetMap
  (the same free geocoder `LocationSearchInput.tsx` already uses). Best-effort throughout — no
  pin when neither resolves. A dinnerplan can carry its own Maps link (`maps_url`, set when
  planning it); the con location and hotel (Admin → Evenementen) can too — useful for a venue
  whose name geocodes unreliably or not at all (e.g. a hotel chain resolving to the wrong city).
- **Parkeerplek**: where a driver's car is parked, as its own 🚗 pin — set from Crew ("Parkeerplek",
  next to "Locatie pingen", only offered once there's a car you can set: yourself as a driver, or
  anyone you share a ride with, either direction). Keyed by the driver's name, not a specific ride
  (`app/routers/parking.py`; one row per trip+driver, `UNIQUE (trip_id, driver)` — correcting it
  just updates the same row) — anyone on that driver's ride may set or correct it, it doesn't
  matter who actually taps the pin down. The popup resolves live, client-side, to whichever of
  that driver's Outbound rides is current (`CrewMap.tsx`): a departure time and a link to the ride
  once one's been planned, otherwise "Nog geen terugrit gepland." The pin itself lingers for 2
  hours after that ride's departure time, then drops off the map on its own — no explicit cleanup.
- A **profile** has an avatar (from Discord/Google, or a member's own upload — see below),
  banner (colour or image), name font and colour,
  pronouns, bio, badges, aliases (former names), phone number and, on the current
  trip, room. Others see a popup with a "Bekijk profiel" button
  (`components/common/UserProfilePopup.tsx`); it scrolls inside itself on small screens.
- Renaming keeps history: old data stays under the old name, which becomes an alias. A list that shows people
  (who goes, the avatars, the counts, who is missing a ride) therefore groups the names that belong to one member
  into one person (`utils/people.ts`: `groupPeople`, `tripPeople`), whichever name each day was signed up under;
  taking someone off a list still removes the names as stored.
- **Profile pictures stay small.** A custom avatar is cropped to 384 px (was 512) before upload, and every
  place that shows a Discord or Google picture asks for the size it needs (`avatarSrc()`, 64 to 256 px)
  instead of the provider's full-size file: a screen can show dozens of avatars at 24 to 40 px.
- **Profielfoto en banner**: a pencil badge on the avatar, and another on the banner itself
  (Profiel, own profile only; `prepareAvatarFile()` in `utils/imageCompression.ts` is the shared
  upload-prep logic) opens a picker — JPG/PNG/WebP (centre-cropped to a square client-side for
  the avatar, 3:1-cropped for the banner) or a small GIF (kept as-is so the animation survives;
  not cropped). The avatar upload replaces the Discord/Google one and is marked `avatar_custom`,
  which stops the periodic resync below from overwriting it. Deleting either is a small trash
  icon next to its pencil, not a text link. The same upload flow (`StepProfile.tsx`'s
  `ProfilePhotos`) is available during onboarding, saving immediately rather than waiting for
  onboarding to finish.
- **Avatars stay current on their own**: since a stored `avatar_url` was previously only ever
  filled in once and then frozen, a changed or since-broken Discord/Google picture could stay
  wrong (or a broken image) forever. It is now re-checked once a day per profile
  (`avatar_synced_at`) and replaced when it differs — skipped entirely for a custom upload.

## Search

`components/layout/GlobalSearch.tsx`. The magnifier in the top bar opens a search
over trips, rides, meals, cosplays and crew. It filters the data the app already
holds in its query cache, so opening it makes no requests.

It also finds **actions** ("Acties": Locatie pingen, Parkeerplek opslaan, Rit aanmaken,
Etentje plannen, Hotelkamers, Cosplay toevoegen, Foto's, Kosten en afrekenen), matched on the
label and on aliases such as "lift" or "diner" (`utils/searchActions.ts`, where a new one is
added). An action that belongs to a trip acts on the **current trip** (`currentTripId`, as the
Event tab does) and names it on the card; ride and meal creation are left out once that trip is
over. The card navigates with `location.state = { action }` and the target page opens its sheet
through `hooks/useRouteAction.ts` (Crew: ping, parking; the Eten tile: addMeal). Rit aanmaken only opens the Vervoer
sheet, where the member picks Rit aanbieden themselves.

## Error screens

Every error screen (`ErrorFallback`, `ServerUnreachable`, `ForbiddenPage`, `NotFoundPage`, and
`public/boot-guard.js`) ends its message with a random Dutch chemistry joke
(`constants/chemistryJokes.ts`). `boot-guard.js` is plain ES5 and keeps its own copy of the list.
The crash screen (`ErrorFallback`) also has "Vertel wat er gebeurde" (`CrashFeedback.tsx`): a bug report with
the page and the technical message appended. It calls the feedback service directly, without React Query or
the router, because that screen can replace the whole app. The other error screens do not have it, as they
appear when the server cannot be reached, the member is not signed in, or the app did not start.

## Notifications

`backend/app/services/`. Four things, all opt-in where they reach a person:

- a **shared webhook** post per new event, ride, expense or meal, reminder and ticket sale;
- **personal DMs or push** per category, chosen under Instellingen → Meldingen (and a step
  in onboarding): a member picks exactly one channel — Discord DM or "Pushmeldingen" on this
  device, never both — then checks what they want to hear about; the category list is the same
  either way. `NotificationChannelPicker` (`components/notifications/`) is that channel choice;
  it only offers a channel that's actually usable (Discord only if the profile has a linked
  account, push only where the browser supports it), and picking one turns the other off —
  selecting push unsubscribes Discord DMs (`allow_dm`) and vice versa;
- **Waarvoor** is grouped (Evenementen, Plannen, and for admins the feedback notification), with a
  quick choice on top: Alles, Alleen belangrijk (`IMPORTANT_CATEGORY_IDS`), Niets. **"Alleen mijn trips"**
  (`profiles.notify_own_trips_only`, on by default) limits new activities and new expenses to people who
  are going on that trip (everyone signed up for any of its days; for an expense also whoever shares in it);
  rides already only went to people on that day. Event and ticket-sale notifications stay for everyone
  who asked. **Testmelding** (`POST /users/me/test-notification`, 5 an hour) sends one message through the
  saved channel(s);
- **payment requests and confirmations**, the same way;
- the in-app **announcement banner** and **changelog banner** (admin-written).

**Pushmeldingen**: per device, independent of Discord — the one channel available to a
Google-only member. Works on Android and desktop from the browser directly; on iOS it needs the
app added to the home screen first, same as every browser's web push (that row explains this
and stays disabled until then). Uses [VAPID](https://datatracker.ietf.org/doc/html/rfc8292), no
third-party service or cost. Its state in `NotificationChannelPicker` reflects the device's real
subscription (via `hooks/usePush.ts`), not a saved preference, so it's always right even after a
reinstall or a permission change made outside the app. See
[deployment.md#web-push](deployment.md#web-push) for server setup.

See [architecture.md](architecture.md#background-jobs-and-notifications) for the schedule.

## Read-only members (kijkers)

Someone who may look at the app but not take part: a parent, a partner, a friend who is not going. They
still go on the whitelist (tick **Alleen kijken** on the entry, and whoever logs in through it gets a
read-only account) or an admin switches **Alleen kijken** on a member under Gebruikers (`profiles.is_viewer`).

- **The backend refuses every change** except their own account settings and marking a story seen
  (`get_current_user`, see [security.md](security.md#authorization)); an admin is never read-only.
- **The app does not offer what they cannot do**: a slim "Je kunt alleen meekijken" bar
  (`ViewerBanner`), no sign-up or day buttons on a trip, no quick-ride tiles, no "Rit aanbieden" or
  "Stap in", no new activity, expense, cosplay, story photo, parking spot or location ping
  (`useIsViewer`). Anything left that does try to change something is not sent
  (`lib/viewerMode.ts`, mirroring the backend's list): it says why, once, and the screen's own
  "kon niet ..." error is held back.
- They keep their own settings, notifications and feedback, and they appear in the crew list like anyone.

## Onboarding, settings and the changelog

- **The back gesture closes what is on top.** A sheet, the story viewer, a photo lightbox, the profile popup, the
  banner crop and a confirm dialog each take a history entry of their own (`utils/backStack.ts`,
  `hooks/useBackClose.ts`; one shared stack, so one back press closes only the top one). Before, a story opened as the
  first thing in the app had no entry, and back left the app.
- **Put the app on the home screen.** On a phone that has not installed the app, the Hub shows a card "Zet
  Ankerd Con op je beginscherm" and Instellingen has the same one: a one-tap *Installeren* where the browser
  offers it (it is caught at start-up, `utils/install.ts`, because the browser fires the event once), the
  Share-menu steps on iPhone, where it is also the only way to get push messages. "Sluiten" on the Hub card
  hides it for 30 days. Not shown on a desktop, or once the app runs installed.

- **Onboarding** (`pages/onboarding/`) runs on first login: a short dialogue with
  the mascot, profile, notifications and a feature tour. Admins can preview it.
- **Instellingen** (`pages/SettingsPage.tsx`): notifications, Discord link, dark
  theme, accent colour, density (comfortable/compact, see [design-system.md](design-system.md#rules)),
  greeting, QR code to the app, the credits, and **Feedback geven**: a sheet where a member
  sends a bug, idea or remark (optionally anonymous, with no name stored) that admins read under
  Admin → Feedback. Admins can also switch on **Nieuwe feedback** in their notification settings
  (category `feedback_submitted`, in `ADMIN_ONLY_CATEGORIES`): a DM or push per message, anonymous ones
  without a name; only an admin can choose it and a broadcast skips a profile that no longer is one.
- **Wijzigingslog** (`pages/ChangelogPage.tsx`): release notes written in the admin
  panel and stored in the database (not `CHANGELOG.md`, which is for developers).

## Admin panel

`pages/admin/`, `backend/app/routers/admin.py`, routes under `/admin` and
`/api/admin`. Admin-only, from the account menu.

| Page | For |
| --- | --- |
| Dashboard | counts and charts |
| Gebruikers, Toegangslijst | members, deactivation, and who may log in at all |
| Ritten, Activiteiten | fix or remove anything, remove single passengers |
| Evenementen, Groepen | trips and their days, series labels, bulk RSVP. Admins also get a pencil on every event page that opens the same edit form |
| Badges | badge images and who has them |
| Betalingen | expenses and shares, including forcing a status |
| Aankondigingen, Wijzigingslog | banners and release notes |
| CDN | every file in the photo bucket, newest first (24 at a time, more as you scroll; videos load their first frame only near the screen), with its uploader; the "Uploaden" button puts an image or video there and gives a link to embed; the viewer's bin deletes a file, whoever uploaded it; "Download … (zip)" saves the current selection (a feature, or one event for story photos) as one zip |
| Inloggen als gebruiker | act as a member for two hours ([security.md](security.md#log-in-as)) |
| Tijdreis | set the app's clock to test live or finished trips |
| Feedback | what members sent through Instellingen → Feedback geven, filtered by status (nieuw, gezien, opgelost); anonymous messages show "Anoniem" |
| Schermen testen | preview the crash, unreachable, forbidden (Discord and Google), 404 and queued-upload screens |
| Preview: Onboarding | walk through onboarding without touching a profile. It renders the same `OnboardingFlow` (`pages/onboarding/`) as the real `OnboardingPage`, so it cannot drift; only saving (nothing) and the done button differ |
