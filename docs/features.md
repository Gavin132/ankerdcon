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

`pages/HubPage.tsx`. From the top:

- **Story row**: an "add" tile and a ring per day with photos, unseen ones highlighted.
- **Upcoming trip ticket** (`components/hub/UpcomingEventCard.tsx`): the nearest
  trip with a countdown, its days and who is going.
- **Today's meals** (`MealTodayCard.tsx`) and **quick ride tiles**
  (`QuickRideTiles.tsx`): offer or join a ride to/from the event or hotel. The
  direction and time are guessed from the clock (`utils/quickRide.ts`).
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
  everyone by name (`TripParticipants.tsx`).
- Below it, a **tile** per part of the trip (`TripTiles.tsx`): Vervoer, Eten,
  Hotel (hotel trips only: address, stay, arrivals and departures, rooms), Foto's, Cosplay (trips with a convention), Weer,
  Praktisch and Uitgaven. Tiles show the answer ("6 rides, 3 people without a ride
  back") and their order changes before, during and after the trip. The amber "zonder rit" and
  "nergens bij" pills open the names of who is missing (a sheet, `MissingPeopleSheet`).
- Tiles open as **sheets** over the page (`TripSheet.tsx`). Vervoer, Hotel and
  Cosplay are routed with `?sheet=transport|rooms|cosplay` so they can be linked;
  Weer, Praktisch and Eten's "add meal" open from local state.
- Multi-day trips get **day chips** to filter by day.

## Transport

`pages/trip/TripTransportTab.tsx`, `components/transport/`, `backend/app/routers/rides.py`.

- **Heen** (inbound), **Terug** (outbound) and **Restaurant** rides. A ride has a
  driver, seats, a departure time, a start and end location and optional parking
  info. Public transport has no seats.
- The driver counts as a passenger; "seats" are the seats for others. Claiming and
  leaving a seat work for anyone, see [acting-for-others.md](acting-for-others.md).
- **"Ik rijd"** on Heen/Terug becomes **"Rit verwijderen"** once you already drive
  that direction that day. It asks to confirm and warns when others have joined.
  `DELETE /api/rides/{id}` is for the driver or an admin.
- **Restaurant rides** are created from a meal that needs transport and can have
  several cars, each with its own seats (`RestaurantRideGroup.tsx`, `CarCard.tsx`).
- **Car loading advice** (Heen and Terug, per day): from the number of people signed up for
  that day and the cars offered, each car shows how many it should leave with so nobody is
  left behind (`utils/carBalance.ts`). Cars go in departure order; whatever an early car
  leaves without, the later ones have to take. With 11 people and three 5-seaters the first
  should take 3–4; if it leaves with 2 the second needs 4–5; if that one leaves with 4 the
  third has to be full. Each car has a pill ("Nog 1 nodig · doel 3–4", "Op schema"), and the
  direction shows people, cars, seats and who has no car yet or how many seats are short.
  It is live advice from today's sign-ups and never blocks anyone: cars rarely leave on
  time, so nothing is locked in. Public transport and cars that left over two hours ago are
  left out.
- Ride cards change colour as departure nears and show a countdown; a ride stays
  visible for two hours after it leaves, then moves to the history
  (`utils/rides.ts` → `getRideStatus`).
- The vehicle icon comes from `rideVehicleIcon`: a train for public transport, a
  truck for one specific member (by profile id), otherwise a car, drawn smaller for
  4 seats or fewer.

## Food

`components/food/`, `components/meal/`, `backend/app/routers/meals.py`. A meal has a
time, location, cost, dietary notes, links, whether it needs transport, and
participants. Anyone can plan a meal for a trip (`TripMealSheet.tsx`); only its
creator or an admin can delete it. The Eten tile lists the next meals, and its
"nergens bij" pill opens the names of the members who are not at any meal yet.

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

- Anyone can add a photo to a day, from the Hub, the trip ticket or the Foto's
  tile. It is compressed in the browser (max 1600 px), re-encoded by the backend
  and stored in MinIO.
- A **story** is the day's photos in upload order (`seq`). Each member's progress
  is stored per day (`story_seen`), so a ring shows "unseen" until you have
  watched to the newest photo.
- **A photo that can't be sent is queued**: it is saved in IndexedDB and sent
  automatically when the connection returns (`hooks/usePendingStoryUploads.ts`,
  `store/pendingStoryUploads.store.ts`), even after the app was closed. The upload
  button shows an amber badge with how many are waiting.
- Only the uploader can delete a photo (there is no admin override yet, see
  [TODO.md](../TODO.md)); anyone can download the original.
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
- **Abonneren** gives a private `.ics` link for a calendar app
  (`GET /api/calendar/feed.ics?token=…`). Change `CALENDAR_FEED_TOKEN` to invalidate
  every shared link.

## Crew and profiles

`pages/CrewPage.tsx`, `pages/ProfilePage.tsx`, `components/crew/CrewMap.tsx`.

- **Crew** is the member directory plus **"Waar is iedereen"**: a Leaflet map of
  fresh location pings.
- A **location ping** is a zone or text and, when you allow it, GPS coordinates,
  stored on the profile and considered fresh for two hours. Pings within 20 m of each
  other share a pin.
- A **profile** has an avatar, banner (colour or image), name font and colour,
  pronouns, bio, badges, aliases (former names), phone number and, on the current
  trip, room. Others see a popup with a "Bekijk profiel" button
  (`components/common/UserProfilePopup.tsx`); it scrolls inside itself on small screens.
- Renaming keeps history: old data stays under the old name, which becomes an alias.

## Search

`components/layout/GlobalSearch.tsx`. The magnifier in the top bar opens a search
over trips, rides, meals, cosplays and crew. It filters the data the app already
holds in its query cache, so opening it makes no requests.

## Notifications

`backend/app/services/`. Four things, all opt-in where they reach a person:

- a **shared webhook** post per new event, ride, expense or meal, reminder and ticket sale;
- **personal DMs** per category, chosen under Instellingen → Notificaties;
- **payment requests and confirmations** as personal DMs;
- the in-app **announcement banner** and **changelog banner** (admin-written).

See [architecture.md](architecture.md#background-jobs-and-notifications) for the schedule.

## Onboarding, settings and the changelog

- **Onboarding** (`pages/onboarding/`) runs on first login: a short dialogue with
  the mascot, profile, notifications and a feature tour. Admins can preview it.
- **Instellingen** (`pages/SettingsPage.tsx`): notifications, Discord link, dark
  theme, greeting, QR code to the app, and the credits.
- **Wijzigingslog** (`pages/ChangelogPage.tsx`): release notes written in the admin
  panel and stored in the database (not `CHANGELOG.md`, which is for developers).

## Admin panel

`pages/admin/`, `backend/app/routers/admin.py`, routes under `/admin` and
`/api/admin`. Admin-only, from the account menu.

| Page | For |
| --- | --- |
| Dashboard | counts and charts |
| Gebruikers, Whitelist | members, deactivation, and who may log in at all |
| Ritten, Maaltijden | fix or remove anything, remove single passengers |
| Evenementen, Groepen | trips and their days, series labels, bulk RSVP. Admins also get a pencil on every event page that opens the same edit form |
| Badges | badge images and who has them |
| Betalingen | expenses and shares, including forcing a status |
| Aankondigingen, Wijzigingslog | banners and release notes |
| CDN | every file in the photo bucket, newest first, with its uploader; the "Uploaden" button puts an image or video there and gives a link to embed; the viewer's bin deletes a file, whoever uploaded it |
| Inloggen als gebruiker | act as a member for two hours ([security.md](security.md#log-in-as)) |
| Tijdreis-widget | set the app's clock to test live or finished trips |
| Schermen testen | preview the crash, unreachable, forbidden, 404 and queued-upload screens |
| Preview: Onboarding | walk through onboarding without touching a profile |
