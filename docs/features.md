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

**Going into an event must be seen.** The Agenda and Hub tickets and the event page's own ticket look alike, so two
things say the page changed. The top bar of an event page has a back arrow (`usePageHeader`, `store/pageHeader.store.ts`;
it goes back like the back gesture, or to the Agenda when the link was the first page of the session) and, from `sm` up, the
trip's name; a phone's bar is full of buttons, so there it only says "Event". And the page slides in from the right when you
open an event, in from the left when you leave one, and fades between the tabs (`AppShell.tsx`; enter-only, because an exit
animation moves the bottom nav; the browser's reduce-motion setting turns the sliding off). Moving from one trip to another keeps
its own slide.

**Event** opens the *current* trip. Old paths (`/transport`, `/food`, `/more`,
`/members`, …) redirect to their new homes, so bookmarks and shared links keep
working (`router.tsx`, `config/routes.ts` → `legacy`).

## Hub

`pages/HubPage.tsx`. From the top (on a phone the two ride buttons come straight after the trip, then "Voor jou", then a meal today and the shortcuts; from `xl`
the trip, the ride buttons and a meal today are the left column and "Voor jou" with the shortcuts the right one):

- **Story row**: an "add" tile and a ring per day with photos, unseen ones highlighted. It only shows
  once a day has photos or the trip is a day away; weeks before, it would be empty circles.
- **Upcoming trip ticket** (`components/hub/UpcomingEventCard.tsx`): the nearest
  trip with a countdown, its days and who is going. More than one upcoming trip becomes a
  carousel (`UpcomingEventsCarousel.tsx`, the shared `components/common/Carousel.tsx`: the browser's own scroll-snap, so the finger drags the row and a tap on a dot glides; the Agenda and the event page page the same way): swipe it or use the dots (`Pager`; the arrows show from `md`).
  It never moves by itself. On a phone the row is as tall as the card in view; from `lg` up all cards are as tall as the
  tallest one, so paging does not move the dots or anything below.
- **Quick ride buttons** (`QuickRideTiles.tsx`, straight under the trip; **today's meals**, `MealTodayCard.tsx`, is the
  shortcut card after it): offer or join a ride to/from the event or hotel. The
  direction and time are guessed from the clock (`utils/quickRide.ts`).
  One grey line above the two buttons says what the sheets open on. "Meerijden" is the same day chips and Heen/Terug rows as the Vervoer sheet (`JoinRideModal.tsx` reuses
  `RideRow`). Where a new ride starts and ends is `defaultRideEnds` (`utils/rideLocations.ts`),
  shared with the Vervoer sheet: the venue on the event side and, on a hotel trip, the hotel on
  the other side except for the first Heen and the last Terug (those are from and to home).
- **Mijn ticket shortcut** (`TicketShortcutCard.tsx`): one tap to the current trip's ticket
  in a sheet over the Hub (only the member's own ticket, not the ticket vote: `TicketSheet` with `mineOnly`), reading
  straight from the same on-device store as the event page's tile — its text changes depending on whether you've
  saved one yet. `?openTicket=1` on a trip page still opens the sheet once, a one-shot flag that is stripped, not a
  real deep link — there is nothing server-side for it to point at.
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
  the checked day cards and "Jij en 3 anderen" say it. Under the title are flat chips (`InfoChip`, the same on the
  Hub and the Agenda): the place (a Maps link), the hotel and, when the event has a website, a globe chip that says "Website"
  (short on purpose, so the chips fit on a phone; the address is the tooltip and the screen-reader label via `siteLabel`; only http(s) links, opens in a new tab). The date is the small line above the title on all three cards.
- The line at the top of the ticket names what kind of trip it is: an admin can tag an event
  **Con**, **Gathering** or **Concert** (`events.event_type` — Admin → Evenementen); untagged
  falls back to "Con" when the trip has con programming (`has_con`) or "Reis" otherwise. Shown
  the same way in the Agenda ticket and the Hub's upcoming-trip card.
- A calendar button in the top bar, and "Andere evenementen" under the tiles, open a list of every
  trip to jump to another one (`TripSwitcher.tsx`); on a phone you can also swipe sideways to the
  next or previous trip. The trips are the slides of one **`Carousel`** (`components/common/Carousel.tsx`, the same row as the Hub and the
  Agenda): the next trip comes in beside the one leaving as the finger drags, and the URL follows once the swipe has settled; the
  switcher, going the other way round, glides the row to the trip. Only the trip in view and the two beside it are drawn
  (`TripOverviewPanel`), the rest are empty slides. A one-time pill (`SwipeHint.tsx`) points the swipe out
  the first time a device lands on a page it can actually swipe on, then never shows again (or
  the moment a real swipe happens, whichever comes first). Admins also get a pencil to edit the event.
- Below it, a **tile** per part of the trip (`TripTiles.tsx`): Vervoer, Eten,
  Hotel (hotel trips only: address, arrivals and departures, rooms; the dates of the stay are in the sheet's subtitle), Foto's, Cosplay (trips with a convention; never for a concert), Weer,
  Info (opens the Info sheet), Kosten and Ticket (opens Tickets: the vote and Mijn ticket); the tile labels are
  short so they fit. Tiles show the answer ("6 rides, 3 people without a ride
  back") and their order changes before, during and after the trip. The amber "zonder rit" and
  "nergens bij" pills open the names of who is missing (a sheet, `MissingPeopleSheet`).
- Tiles open as **sheets** over the page (`TripSheet.tsx`). Vervoer, Hotel and
  Cosplay are routed with `?sheet=transport|rooms|cosplay` so they can be linked;
  Weer, Info and Eten's "add meal" open from local state.
- **Mijn ticket** (`TicketTile`/`TicketSheet` in `TripTiles.tsx`) lets a member save a photo or
  PDF of their own event ticket — kept entirely in this browser's IndexedDB
  (`utils/localTickets.ts`, `store/localTickets.store.ts`), never uploaded anywhere. Deliberately
  not in the shared photo bucket or the database: nobody else can see it, not other members and
  not admins, and there is nothing server-side to secure. The trade-off is the flip side of
  that — it doesn't sync to another device and a browser can clear it on its own, so it's a
  convenience, not a permanent archive. The list draws a small square copy of an image ticket (`makeTicketThumbnail`, made when it is
  saved, and once for tickets saved before that, a moment after the sheet has opened), never the original: a 44 px picture of a
  phone photo made the browser decode the whole file and the sheet stutter while it opened. Not the same "ticket" as an event's `ticket_url` (where
  to buy one) — that stays under Info.
- **Kaartverkoop (the ticket vote)** (`TicketVote.tsx`, `hooks/useTicketPoll.ts`, `app/routers/ticket_polls.py`): what
  used to be a Discord poll. An admin opens it in the Tickets sheet with the ticket options (the event's own ticket types
  are filled in and can be changed: "Vr + za + zo", "Za + zo", "Alleen zaterdag", each with a price). Members pick one,
  or "Weet ik nog niet" (somebody who is not going just does not vote), and can change it or take it back ("Mijn stem intrekken") until the tickets are bought.
  Members ask around, so the sheet has a "Stem voor iemand anders" picker: choose a member and the choices and the withdraw button are theirs. While the vote is open the
  Ticket tile is a card of its own, full width and first, with a bar per ticket and a "Stem mee" pill for whoever has not
  voted; the sheet has the choices, who has not voted yet and, for admins, "Tickets zijn gekocht" (pick the buyer and the
  ticket: one person buys for everyone) and "Poll verwijderen". After that the vote is gone from the page: the tile is
  a small "Gekocht door Sam" line and the sheet says so. Money is not kept here: the buyer adds an expense in Financiën.
  People are counted once even when they voted under two names (`utils/ticketPoll.ts`, `groupPeople`).
  The "Wie gaan er mee" list (`TripParticipants.tsx`) shows each person's ticket next to their days: the ticket they
  voted for, "Ticket nog onbekend" for "Weet ik nog niet", and, while the vote is open, "Nog niet gestemd". The vote is
  only fetched when the list is opened, and a trip that is over does not show it.
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
  Hub's "Rit aanbieden" and "Meerijden" buttons would use (`utils/transportView.ts`, built on
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
  several cars, each with its own seats (`RestaurantRideGroup.tsx`, `CarCard.tsx`). "Who has no car yet" is one
  function, `restaurantCarGaps` (`utils/restaurantCars.ts`), used by the Hub's Voor jou, the ride/meal page and the
  Vervoer sheet. It counts people, not names, so someone signed up under a rename or their Discord username is neither
  counted twice nor missed when they are in a car under another name.
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

Who may do what: every member sees the rooms, creates them (one or in bulk), **edits any room**
(number, floor, notes, capacity and who sleeps in it, so they can put other members in or take them out)
and signs someone up or off ("Ik slaap hier", "Verlaat kamer"). Only an admin deletes a room. A read-only member
(*kijker*) can do none of the writes. The names in a room have to be members, and a room cannot hold more people than
its capacity. The rule is written down once, above the hotel routes in `backend/app/routers/calendar.py`
(`update_hotel_room`); the sheet shows the pen to everyone who may use it and the bin to admins.

**A person sleeps in one room of a hotel.** Putting someone in a room (*Ik slaap hier*, the room form's *Bewoners*
list, a new room with people in it) **moves** them: they are taken out of every other room of the hotel in the same
request. One shared function does it for every route (`backend/app/services/hotel_rooms.py`), and the backend decides,
the sheet only shows it. Someone counts as one person under all their stored names (current name, Discord username,
former names), so moving "samdraws" also takes the member's other names out of the other rooms, and adding a member
who is in the room under another name adds nobody. A full room refuses (400) *before* anyone leaves their old one;
the order is add to the new room first, then remove from the old ones, so a failure in between can leave somebody in two
rooms for a while but never in none. The response says who moved (`moved`), and the sheet answers with a toast
("Sam is verplaatst van kamer 12 naar kamer 4."); the room form says near the picker who will be moved.

Rooms made before this rule can already hold somebody twice. Nothing is changed or migrated automatically: the Hotel
sheet marks that person's name in each of those rooms ("Ook in kamer 12") and shows a warning above the rooms ("Sam
staat in 2 kamers"). Picking a room for them again ("Ik slaap hier" or the form) takes them out of the other rooms
(`peopleInSeveralRooms` in `utils/rooms.ts`). The numbers on top and the *zonder kamer* list count people, so
a duplicate is counted once.

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
- **Every upload shows how far it is.** The API client (`lib/api/client.ts`) reports the progress of any request that carries a
  file to `store/uploadProgress.store.ts`, and `UploadProgress` (in `AppShell`) shows one thin bar across the top with "Uploaden… 63%" for
  the whole app, and "Verwerken…" once the file has arrived and the server is still storing it. Uploads under 150 KB are over before
  a bar could be read, so they show none. An event cover is also made small before it is sent (1600 px, the size the server keeps
  anyway; not a PNG or GIF), which is most of the difference on a slow connection. The server logs where a cover spends its time
  (`Stored a event-cover: ... processing ... storing`).
- **Several at once** (`hooks/useStoryPhotoPicker.ts`, shared by both entry points): up to
  30, uploaded one after the other, **oldest first by when they were taken**. The story shows
  upload order, so uploading in capture order is what sorts them. The date is the EXIF
  `DateTimeOriginal` (`utils/photoDate.ts`), read from the original because the canvas
  compression strips EXIF, with the file's `lastModified` as fallback for the order only. One toast sums up the
  batch; after a network failure the rest is queued without waiting out more timeouts.
- **A photo goes to the day it was taken** (`routePhotoDay`, `utils/storyDay.ts`, in `useStoryPhotoPicker`), not to the day
  the page or the Hub tile happens to point at. Only the EXIF date counts: a photo without one (a screenshot, a
  forward) and every video go to the day the upload started from, because their file date is when they were saved.
  Across every event: on an event day, that day (of whichever trip); exactly **one day before or after** an
  event, a day of its own in the trip's Foto's card, kept as a photo of the nearest event day with the date it was
  taken (`story_photos.taken_on`, migration v2.43; an event day is something people sign up for, so none is made for photos);
  further away, the nearest event day. Between two equally near days the earlier one wins. Those days beside an
  event are in `extra_days` of the summary, are opened with `?taken_on=` and have no ring and no "unseen"
  marker, so they are only in the event page's Foto's card, not in the Hub's rings, the recap or its totals. The toast
  says when photos went to another day than the one you were on.
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

- **Upcoming trips** are tickets in a row to swipe through (`TicketStack.tsx`, the shared `Carousel`, dots and arrows from `md`
  under it), with "Ik ga mee" (a sheet to pick the days on a trip of several days) and, once you are going, the "Je gaat mee" sticker to sign off.
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
  onboarding to finish. The profile step of onboarding only asks pronouns, phone number, bio and name colour;
  aliases and the banner colour are set on the profile page. On the profile page "Opslaan" sits in the top bar
  (blue only when something changed), "Zo zien anderen je profiel" is an eye button there, and the banner colour
  is part of "Weergave". The colour dots (`components/profile/ColorSwatch.tsx`), the font stacks and the banner
  style (`utils/profile.ts`) are shared with onboarding and the profile popup.
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

Every error screen (`ErrorFallback`, `ServerUnreachable`, `ForbiddenPage`, `NotFoundPage`) is one
`StatusScreen` (`components/common/StatusScreen.tsx`): the logo or an icon square, the title, what to do, the buttons,
then a joke, and the technical message and feedback form behind "Technische details". Together with
`public/boot-guard.js` they end with a random Dutch chemistry joke
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
  selecting push unsubscribes Discord DMs (`allow_dm`) and vice versa. The channel is applied at once; the
  categories (a `Switch` row each, `NotificationCategoryRow`) are saved with "Opslaan" in the top bar, which stays
  grey until something changed;
- **Waarvoor** is grouped (Evenementen, Plannen, and for admins the feedback notification), with a
  quick choice on top: Alles, Alleen belangrijk (`IMPORTANT_CATEGORY_IDS`: new events, ticket sales, new expenses, the ticket poll and new
  activities, not the reminders a day before or on the day itself), Niets. **Stille uren** (`profiles.quiet_hours_start/end`, migration v2.44; `in_quiet_hours` in `notification_service.py`): between two hours (Dutch time,
  may run past midnight) a member gets no category DM or push; it is skipped, not sent later, and a payment request still arrives. **"Alleen mijn trips"**
  (`profiles.notify_own_trips_only`, on by default) limits new activities and new expenses to people who
  are going on that trip (everyone signed up for any of its days; for an expense also whoever shares in it);
  rides already only went to people on that day. Event and ticket-sale notifications stay for everyone
  who asked. **Testmelding** (`POST /users/me/test-notification`, 5 an hour) sends one message through the
  saved channel(s);
- **payment requests and confirmations**, the same way;
- **Ticket poll** (`ticket_vote`), when an admin opens a ticket vote and when the tickets are bought; limited to the
  trip's people by "Alleen mijn trips";
- **Nieuwe gebruiker**, for admins only, see below;
- the in-app **announcement banner** (stacked urgent first, then warning, then info, newest first within each; `utils/announcements.ts`) and **changelog banner** (both admin-written).

### Nieuwe gebruiker (melding voor admins)

An admin merges a placeholder profile into the real member by hand (Admin → Gebruikers), and needs to know when there
is a new profile to merge. Under Instellingen → Meldingen → "Voor beheerders" an admin can switch on **Nieuwe gebruiker**:
a message "{naam} heeft voor het eerst ingelogd. Is dit iemand van een placeholder? Voeg samen via Admin → Gebruikers."
(a Discord DM with a link to Admin → Gebruikers when `APP_URL` is set, and/or a push that opens that page).

- **Off by default and admins only.** It is a notification category (`new_user`) like Nieuwe feedback: it sits in
  `profiles.notification_categories`, so there is no migration, and a profile starts without it. The row is not shown to
  members, and the backend refuses it from anyone who is not an admin (403, [security.md](security.md#authorization)).
- **Fires** when a profile is *created* by a first login, after a Discord or Google sign-in that was on the whitelist
  (`_create_profile` in `app/dependencies.py`). It does not fire when a login claims an existing stub profile
  (`_claim_stub_profile`), for a returning member, or when an admin adds a profile by hand.
- **Goes to** every active admin who switched it on, through their own channel choice (DM needs `allow_dm` and a linked
  Discord account, push needs a subscription), checked at send time: someone who stopped being an admin or was deactivated
  gets nothing even if they still carry the choice. Never to the new user.
- **Best effort:** sent from its own thread after the profile is saved, errors are logged and never reach the login. It is tied
  to the insert that created the profile, so a retried or simultaneous login announces once.

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
  greeting, **Databesparing** (per device: `store/dataSaver.store.ts`; the story viewer loads nothing ahead and a video
  only after a tap on "Video afspelen"), a **Discord** row that shows the linked account and, only while the login has another way
  in (`hooks/useLoginProviders.ts`), unlinks it (`unlinkDiscordAccount`: the browser unlinks the identity, which Supabase refuses for the
  last one, then `DELETE /users/me/discord` clears the profile), **Mijn gegevens** (**Mijn gegevens downloaden**: `GET /users/me/export`,
  `services/member_export.py`; **Account laten verwijderen**: not done by the app, `POST /users/me/deletion-request` saves a message under Admin → Feedback and tells
  every active admin by DM/push, which they cannot switch off; they delete the account in Admin → Gebruikers), the links (YouTube, Instagram, source code) and QR code to the app, the credits, **Wat is nieuw** (the changelog, under Feedback geven in App; it used to be in the
  account menu, which is now only Mijn profiel, Instellingen, Beheer for admins and Uitloggen) and **Feedback geven**: a sheet where a member
  sends a bug, idea or remark (optionally anonymous, with no name stored) that admins read under
  Admin → Feedback. Admins can also switch on **Nieuwe feedback** in their notification settings
  (category `feedback_submitted`, in `ADMIN_ONLY_CATEGORIES`): a DM or push per message, anonymous ones
  without a name; only an admin can choose it and a broadcast skips a profile that no longer is one.
  The same group, "Voor beheerders", holds **Nieuwe gebruiker** (category `new_user`, off by default, see
  [Nieuwe gebruiker](#nieuwe-gebruiker-melding-voor-admins) below).
- **Wijzigingslog** (`pages/ChangelogPage.tsx`, shown as "Wat is nieuw", opened from Instellingen > App): release notes written in the admin
  panel and stored in the database (not `CHANGELOG.md`, which is for developers).

## Admin panel

`pages/admin/`, `backend/app/routers/admin.py`, routes under `/admin` and
`/api/admin`. Admin-only, from the account menu.

| Page | For |
| --- | --- |
| Dashboard | counts and charts |
| Gebruikers, Toegangslijst | members and who may log in at all. A member is deactivated with the switch "Account actief" in the edit sheet (or in bulk from the selection strip). A profile nobody has logged in to has a "Placeholder" pill (and a filter), and its row has "Voeg samen met…": a sheet where the admin picks the real member, reads what would move and confirms (`UserMergeSheet`, [security.md](security.md#placeholders-and-merging)) |
| Ritten, Activiteiten | fix or remove anything, remove single passengers |
| Evenementen, Groepen | trips and their days, series labels, bulk RSVP; "Aankomend" / "Geschiedenis" switches the list. The eye on a row opens the event in the app. Admins also get a pencil on every event page that opens the same edit form |
| Badges | badge images and who has them |
| Betalingen | expenses and shares, including forcing a status |
| Aankondigingen, Wijzigingslog | banners and release notes |
| CDN | every file in the photo bucket, newest first (24 at a time, more as you scroll; videos load their first frame only near the screen), with its uploader; the "Uploaden" button puts an image or video there and gives a link to embed; the viewer's bin deletes a file after a question, whoever uploaded it; "Download … (zip)" saves the current selection (a feature, or one event for story photos) as one zip |
| Inloggen als gebruiker | act as a member for two hours ([security.md](security.md#log-in-as)) |
| Tijdreis | set the app's clock to test live or finished trips |
| Feedback | what members sent through Instellingen → Feedback geven, filtered by status (nieuw, gezien, opgelost); anonymous messages show "Anoniem" |
| Schermen testen | preview the crash, unreachable, forbidden (Discord and Google), 404 and queued-upload screens |
| Preview: Onboarding | walk through onboarding without touching a profile. It renders the same `OnboardingFlow` (`pages/onboarding/`) as the real `OnboardingPage`, so it cannot drift; only saving (nothing) and the done button differ |
