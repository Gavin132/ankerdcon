# Changelog

All notable changes to Ankerd Con are documented here.

---

## [Unreleased]

### Added

- **Admins can merge a placeholder into the real member.** A member who had not logged in yet can be put on rides,
  meals and expenses through a placeholder profile (Admin > Gebruikers). When that person logs in they get a profile of
  their own; "Voeg samen met…" on the placeholder shows what would move (rides, activities, trip days, rooms,
  expenses, settlements, cosplays, photos and so on), and on confirming it moves all of it to the member, makes the
  placeholder's name one of the member's former names and removes the placeholder. Placeholders have a pill and a filter.

### Fixed

- **A restaurant ride named the restaurant twice.** Its page said "Van: <restaurant>" and "Naar: <restaurant>" and
  put the full address in the big title. It now shows the meal's name as the title, the address under it, and the
  top bar says "Rit naar <meal>".
- **Betalingen overflowed on a phone.** The rows of an expanded expense ran past the edge of the screen; they are two
  lines now (who and how much, then the status). The filter is the four status buttons plus one list of expenses
  instead of a button per expense.
- **Deleting a day of an event had no question.** It also took the sign-ups and rides of that day with it. It now asks
  first, and taking someone off a day asks too.
- **The row checkboxes in the admin tables were 16 px to hit** on a phone; they are 44 px now.
- **The admin "Admin-rechten" switch did not count as a change**, so closing the sheet after only toggling it gave no
  warning about unsaved changes.
- **Counts of people used the number of names.** Someone signed up under two names (a rename or a Discord username)
  counted twice in "N mee" on the day tiles, the meal and ride sign-ups and the plan of a trip. They count once now.
- **A long description of an event was cut off** with no way to read it; "Meer" opens the rest.
- **The Google Maps link of an activity was saved but never used.** The Route button now opens it, also for an
  activity without an address.
- **A read-only member was offered "Nog geen rit… Tik om een auto aan te bieden"** on an activity and could press
  "Uitstappen" on a ride; both are left out for them now.
- **The Discord hint pointed at the profile** ("koppel Discord via je profiel"). Linking Discord is in Instellingen.
- **Time travel was ignored in the admin dashboard greeting, the events list (upcoming or history), the changelog's
  default date and the default time of a restaurant ride.** They follow the app's clock now.
- **The time-travel page described a floating button that is no longer there.** It is called "Tijdreis" and talks about
  the clock in the bar.
- **The changelog page of the admin panel printed the date as 2026-10-22.**

### Changed
- **A concert has no Cosplay card, tab or search suggestion.** Other events (cons, gatherings, trips) keep them.
- **In the admin users list, an admin is a shield on the corner of the profile picture**, in your accent colour, instead
  of an "Admin" label, and "Placeholder" is a small grey line under the name.

- **Every action button is blue now.** "Andere evenementen", "Route", "Tickets kopen", "Officiële website", "Parkeerplek", "Locatie pingen", "Afmelden", "Iemand aanmelden" and the other buttons that used to be an empty outline are the same blue as the rest; only "Annuleren" next to a confirm stays outlined, and the small add buttons (photo, "+" on Activiteiten) stay grey.
- **The "Praktisch" tile is called "Info"** and shows the number of topics small, with the topics under it, so it fits on a phone. The text under "Parkeerplek" and "Locatie pingen" is gone: tapping "Parkeerplek" still tells you when it cannot be saved.
- **The blue buttons are a deeper blue with white labels.** Buttons, the chosen filter and the active tab in dark mode, switches
  and the countdown stub use a deeper blue so the white text on them reads well, and the accent colours in Instellingen
  are deeper to match (gold is now a dark amber).
- **Buttons have a calmer, outline-free look.** The blue button is a plain blue fill without the black outline, the
  other buttons are a thin line on the background, and the red "Verwijderen" is a plain red fill. Inloggen met Google
  has its own soft button under a "of ga verder met" line. Greyed-out buttons are flat grey, and a button that is
  busy keeps its size while the spinner turns.
- **The "Vervoer regelen" switch of an activity looks like every other switch** (it was a thicker, hand-made one in the
  edit sheet), and the small status labels on an expense and on today's meal are the same size and shape as the other
  labels.
- **Nothing shrinks or zooms when you press or point at it.** The day tiles of a trip and the clickable cards no longer
  shrink under your finger, and the photos in the recap no longer zoom on hover; a press dims the thing like it does
  elsewhere.
- **All text fields in the admin panel are as big as the ones in the rest of the app** (16 px text and the same
  height, on a computer too). The fields in the sheets, the search boxes and the filters of Betalingen used to be
  smaller on a wide screen.
- **Icons come in a fixed set of sizes** (12, 14, 16, 20, 22), so the same icon is the same size everywhere; the little
  icons that were 9 to 11 px are 12 now, and the vehicle icon of a ride no longer shrinks for a small car.
- **Empty lists look the same everywhere.** "Geen gebruikers gevonden", "Nog geen groepen", "Nog geen auto's aangemeld"
  and the other empty lists in the admin panel, the cosplay filters, the profile photos and the trip pages are one
  empty state: an icon, a short title, sometimes one line of help or a button.
- **Detail pages of an activity and a ride show a grey outline of the page while they load** instead of a lone spinner,
  and the spinner you see when the app starts is blue everywhere (also on the dark start screen).
- **A chosen option looks the same everywhere.** The zone of a location ping, the driver of a parking spot and the kind
  of feedback are chips that turn dark when chosen (like the filters); the day tiles, the sort options and the
  accent colours keep their thin border and get a tinted background. Nothing is drawn with a thick outline for being
  chosen any more.
- **One scale of rounded corners.** Boxes that hold content (the share lines of an expense, menus, the recap calendar,
  the stub overview) have the same 12 px corners as the other cards, and the odd 9 px and 5 px corners of the day
  tiles, thumbnails and admin fields are gone.
- **Dates and counts are written like a sentence, labels in capitals.** The date of an event on the ticket, in the
  recap and in the sidebar, the day tiles of the recap, the date of a meal, the opening line of the login page and
  the sentences on the splash and onboarding screens no longer shout in capitals; capitals are kept for the labels
  that name a group or a field ("Van", "Naar", "Chauffeur", the table headers) and for tags and chips.
- **Nothing is smaller than 12 px any more**: the counters on the filters of the cosplay page and the warning badge of
  the admin panel are bigger, and the tab bar keeps its 12 px labels on the narrowest phones.
- **Colours are the same everywhere, in light and in dark mode.** Warnings, errors, "ok" messages, the red delete
  buttons, the coloured banners, the chips on the dark headers and the initials of members without a photo now use one
  shared set of colours instead of being coloured one by one, so a screen can no longer look different in dark mode
  than the rest. Brand-coloured text on a light blue background is a touch darker so it reads better.
- **Your name colour is readable on every theme.** A name colour that would disappear on the dark (or light) page, like
  a dark purple on the dark profile page, is shown a bit lighter (or darker) there; the colour you picked is not
  changed.
- **Admin: Betalingen, Aankondigingen and the other pages.** Betalingen shows the three totals in one card instead of
  three stacked cards and sets a share's status with a list (Openstaand, Geclaimd, Bevestigd) instead of three lettered
  circles. Aankondigingen shows the type as a pill with words, a switch for "Actief" and two lines of the message; its
  sheet, and the sheets of Badges and Wijzigingslog, use the shared footer and switches. The CDN page has the file
  kinds as a switch row, the zip download next to "Uploaden", flat tiles (no zoom, no gradient), and asks before
  it deletes a file for good. Badges hides the drag handle on a phone, where dragging never worked. Inloggen als
  gebruiker, Feedback, Tijdreis and Schermen testen follow the shared frame; "Echte crash veroorzaken" has its own
  heading and a warning box so it is not tapped by mistake.
- **Admin: calmer lists and sheets.** Every admin page has the same width, padding and rhythm. The tables use the shared
  header and cell styles (12 px headers, no more 10.5 px), and on a phone a row is two lines: the name and the buttons,
  then the date, place or price, so the name is no longer squeezed to a few letters (Ritten, Activiteiten,
  Evenementen). Gebruikers shows a pill only for what is not normal (Admin, Kijker, Inactief); deactivating a
  member moved into the edit sheet as the switch "Account actief" and the bulk bar, and both ask first, because it
  takes the member off every event. Evenementen has "Aankomend" /
  "Geschiedenis" as a switch next to the group filter, shows the dates once ("17 – 19 nov. 2026 · 3 dagen"), calls the
  tag "Soort evenement" (Con, Bijeenkomst, Concert), has a separate "Bekijken in de app" button instead of a clickable
  row, and its sheet folds Tickets & links and Praktische info away for an existing event. Faces in the tables count
  people, not stored names. The sheets use switches for yes/no (hotel, car available, vervoer nodig) and a 44 px
  line for the "Con" checkbox of a day.
- **Admin: smaller things.** The search box is 44 px tall; the pager buttons are spaced so they do not overlap; the
  page loading state is the outline of a page instead of a spinner; the dashboard greeting follows the page rules
  ("Beheer" above your name, normal-case date line) and its chart takes the theme and accent colours; the category
  flags are a soft tint with a tick; the Toegangslijst has labelled fields; hints are 12 px; every sheet's save button
  says "Opslaan" (edit) or "Toevoegen" (new).
- **Profile, settings and Meldingen:** "Opslaan" and the new "Zo zien anderen je profiel" button (an eye, on a phone too)
  are in the top bar of the profile; Opslaan is only blue when something changed, and the same goes for Meldingen, where
  the categories are switches instead of checkboxes and a line says the channel is applied at once. Form labels are
  normal field labels, the banner colour moved into "Weergave", the colour dots have a slash for "automatisch", the
  unreadable near-black and lime name colours are gone from the choices, and a profile that is loading or not found
  keeps its top bar. Instellingen says "Voor dit apparaat" once, "Begroeting tonen" sits under Account, and GitHub and
  YouTube show an arrow out instead of a chevron. "Wat is nieuw" has the spacing of the other pages and "Versie 2.19.0"
  for a bare number.
- **Error screens (404, geen toegang, server onbereikbaar, crash)** are built the same way: logo or icon, a title, what to
  do and the buttons first; the joke follows, and the technical message and the feedback form are behind "Technische
  details". The login page says "Log in om verder te gaan" once, the "Aanbevolen" tag is a pill under the Discord button
  and an error there is announced to screen readers. The profile step of onboarding is shorter (no aliases, no banner
  colour, no second preview).
- **Financiën is calmer.** A row of Afrekenen or Ritkosten is two lines and the amount says which way the money goes
  (red = you pay, green = you receive); a pill is only there where you have to do something ("Te betalen",
  "Bevestigen", "Wacht op bevestiging", "Invullen"). On a phone the list of expenses and its add button come right after
  what you owe, and the group's totals ("Betaald per persoon", top 3) come last. The settlement sheet has one blue
  button (the payment link is a quiet one), no longer shows the amount four times and says since when instead of the
  amount in its title. "Ontvangen" and "Ik heb betaald" in an expense are quiet buttons. The new-expense form is plain
  fields instead of five cards, in the order description, amount, date, paid by, event. The Ritkosten sheet has a one-line
  intro and Opslaan under the form, and the total and your share are two rows. A long expense title shows on two lines.
- **Activity and ride pages are calmer.** The activity header is one kicker line, the name, and three plain lines (when,
  where, price) instead of five chips; "Vervoer nodig" is said once, in the transport block. The sign-up row is one
  button: "Aanmelden" until you are on the list, then "Afmelden" and "Iemand aanmelden". The ride header got the
  departure time, one status chip at a time ("Vertrekt over…" before "Actie vereist"), "+N" for more than five riders
  and "Deze rit zit vol"; "Uitstappen" is only offered to someone on the ride (or an admin). The top bar says
  "Activiteit" or "Rit" and the page has one heading.
- **Restaurant cars:** the "3 personen hebben nog geen rit" banner and the dashed "Auto toevoegen" tile are gone (the box
  under the cars says who has no car yet, in amber), "Stap in" is the quiet button and "Ik rijd" the one blue one, and a
  car says "Chauffeur · 4 plekken" with "Uitstappen" as a text button.
- **Practical info and links of an activity** are plain rows instead of icon squares and boxes in a box; the map card says
  "Kaart" with the way there, and the linked activity or event on a ride is one tappable card.
- **Search:** an empty search suggests "Locatie pingen", "Rit aanmaken" and "Parkeerplek", the results of a group are
  one card with a row per result, and "Niks gevonden" is a proper empty state.
- **Shared controls:** the switches between two or three views (Tickets/Recap, Alles/Waar ik was, the years of the
  stubs, Heen/Terug, Aanmelden/Afmelden, Gelijk/Vast/Handmatig) are one control, and so are the seat choice of a car
  (2 to 7, "Incl. jezelf") and the faces of a list of people ("+3" counts people, not names). The quick-ride sheet's
  departure chips are 44 px to hit.
- **Vervoer sheet:** the headings are small labels with a count ("4 ritten") instead of display titles as big as the
  sheet's own, the list of people without a ride under the sections is gone (each section names them already), "Ik rijd"
  on an activity is the quiet button, a missing car is an amber notice instead of a red dashed box, a ride's row only
  shows "doel" when the car is short of it, and the form asks the seats the same way as the quick-ride sheets.
- **Hotel sheet:** the numbers ("4 kamers · 7 van 14 ingedeeld") are at the top and the two buttons sit in the footer
  ("Meerdere", "Nieuwe kamer"). A room card says "1 van 2 bezet" once instead of three times, a full room has no
  button, and your own room is outlined in the app colour instead of the heavy black border.
- **Cosplay sheet:** the dashed "Cosplay toevoegen" card is gone (the button above the list does it), a cosplay's
  days read "di 27 · do 29 okt" in plain text and the photo count only shows when there are photos.
- **Forms in the trip sheets** have their save button in the footer, with the labels above the fields in the same style
  everywhere.
- **Event page tiles:** the "Vervoer" tile lost its Heen/Terug bars (the "zonder rit" pill says who is missing), the
  "+" on Activiteiten and the camera on Foto's are the same quiet button, the info tile is called "Praktisch" and
  says how many topics it holds, an odd small tile at the end is stretched over the row instead of leaving half of it
  empty, and the day cards read "Di", "Wo" above the number (the month is for screen readers).
- **Hotel sheet:** the dates of the stay are in the title bar, the address is a link, and late arrivals and early
  leavers read the same here and in "Praktisch" ("komt do 19 nov", "vertrekt wo 18 nov", "alleen di, do").
- **Adding an activity:** the day is chosen with the same chips as everywhere else (and only asked when the trip has
  more than one day), and "Vervoer regelen" is the app's usual switch.
- **A calmer Hub.** "Voor jou" comes right after the trip on a phone, above the meal, ride and shortcut cards. Only
  what is yours to fix is coloured (no ride for you, money to pay); the rest of the rows and the count are grey. The
  trip carousel no longer swaps cards by itself (swipe or use the dots), the story row waits until there is something
  to see, the two ride tiles share one grey line instead of repeating it, and the ticket says "Vandaag" or
  "Nu bezig, dag 2 van 3" once instead of three times.
- **Agenda:** "Abonneren" is "Agenda-link" with a "Kopieer link" and a "Google Calendar" button instead of a raw link,
  the cards behind the top ticket no longer print the next trips' names (the counter says "1 van 4"), and the
  dots and arrows are the same as on the Hub and 44 px to hit.
- **Crew:** a member's Discord name only shows when it differs from their name, the "location shared" dot no longer
  pulses, and an empty search is a proper empty state.
- **The Event ticket is shorter on a phone** (a lower cover, none for a trip without a picture), and "Iemand aanmelden"
  moved from the ticket to the list of people who are going.
- **Easier to hit on a phone.** Small controls are 44 px to hit now, and spaced so two of them no longer share a
  touch area: the edit and delete buttons of a hotel room, the colour swatches and alias chips on your profile, the
  paging buttons and search clear button in the admin panel, the arrows of an activity category, the delete
  buttons of a ride and a room, "Sluiten" and "Alle dagen" in the recap, the buttons of the crew and crash screens, the account
  menu rows and the onboarding footer.
- **Screen readers:** icon-only buttons now have a name (story viewer, search, tiles, admin tables, alias and name
  chips), the story viewer, the search and the cosplay picture are dialogs that close with Escape, a tile of the
  Event page is one link instead of a link with buttons inside it, and the account menu is a real menu.
- **Admin: activity categories** use the same on/off chips as the rest of the app, the up and down arrows sit side
  by side, the feedback status buttons are chips, and a metric on the dashboard that goes nowhere is no longer a button.
- **Cosplay inspiration:** the link to the original picture is in the picture's own view ("Bekijk origineel") instead
  of a hover-only corner icon that did not exist on a phone.
- **One word for everything.** "Evenement" everywhere instead of the English "event" (the agenda, the recap, finance,
  admin, a few error messages), "Meldingen" instead of "Notificaties", "Toegangslijst" instead of
  "Whitelist", "Beheer" instead of "Admin portal". Buttons say "Annuleren", "Verwijderen" and "Kopiëren"; "1 groep"
  instead of "1 groepen". In the admin panel rides read Heen / Terug and Auto / Openbaar vervoer instead of
  Inbound / Outbound / Car / Public Transport, and the activities page says "Activiteiten" throughout.
- **Settled money says "Verrekend"** (it was "Afgerond" in the settle-up list), the balance card says "Netto te
  ontvangen" / "Netto te betalen", and a request to pay shows "Te betalen".
- **Login page:** a smaller title and the text "Het ledenportaal voor Ankerd-evenementen" / "Alleen voor Ankerd-leden".
- **Collected stubs:** the tilted "Geweest / Gemist" stamp is gone (a missed one is dashed and says "Gemist" in its
  footer) and the stats read "evenementen mee" and "hotelverblijven".
- **Event page tiles** say "Geen ritten", "Niets gepland", "Geen kosten" and "Foto's" when empty, and the
  transport tile reads "Heen: met Sam, di 07:30 · Terug: nog geen rit".
- **Admin: event groups** is a list that turns into cards on a phone, with a shorter placeholder and buttons you can hit.
- **Announcement bar:** a warning is amber with dark text (it was white on amber, hard to read), an info message is a
  quiet strip instead of a near-black bar, a long message shows two lines instead of one and has an arrow to open it,
  and the close button no longer sits inside the button that opens the message. On a phone with a notch the text no
  longer starts under it.
- **"Nieuwe versie beschikbaar"** is a strip at the top of the screen (with "Herladen") instead of a bar floating
  over the tab bar with a bouncy entrance.
- **Admin, selecting rows:** "N geselecteerd" with Deactiveren / Verwijderen is a block above the table, not a bar
  floating over the last rows and the page buttons. Deleting asks in a dialog.
- **Admin, deleting one row** asks "Verwijderen? Annuleren Verwijderen" with big buttons; the red button is red
  everywhere (and "Sluiten zonder opslaan" is no longer the blue one).
- **Admin top bar:** the page name is no longer written twice (top bar and title); the bar says "Admin".
- **Admin tables on a phone:** a row's name takes what is left of the line and its buttons stay where they are, so
  rows no longer wrap differently depending on how long a name is.
- **Profile:** "Opslaan" is in the top bar, grey while nothing has changed and blue when there is something to save;
  a line under the head says that the photo and banner are saved right away.
- **Rides and activities:** the buttons in the dark header (Afmelden, Uitstappen, Aanmelden, Stap in) are the same
  height on both pages; the main button of the Aanmelden, Afmelden, Stap in and Uitstappen sheets sits at the bottom
  of the sheet; "Nog geen rit" is a calm row with an "Ik rijd" button instead of a red dashed button.
- **The car you ride in** is a soft tint with a bar on the left, in your accent colour, instead of a solid blue block.
- Prices are always written "€ 37,50" and file sizes "3,2 MB".


- **Hub:** "Ticket opgeslagen" and "Locatie pingen" are two rows of one card instead of two cards, and the row of
  event cards is as tall as the card you are looking at (no empty gap above the dots when a shorter card is shown).
  The cards out of view can no longer be reached with the keyboard.
- **Transport:** "Rit aanbieden" for Heen and Terug is the quiet button, so "Ik rijd" is the one blue button; with no
  ride yet the sheet says "Nog geen rit, zonder vervoer: …" once instead of twice.
- **Spacing:** the Hub, Agenda, profile, settings, meal and ride pages use the same space between blocks and the
  same page padding, which also lines the content up with the title bar.
- **Easier to hit:** blue buttons, the "Toch niet? Afmelden" links, "Iemand aanmelden", the "zonder rit" and "nergens
  bij" pills, the location link and the list of who is going all have a 44 px area to tap.

---

## [2.1.5] - 2026-10-28

### Fixed

- **Removing a car from a restaurant ride made the other cars jump.** The cars did not pass the browser what it
  needs to keep the rest in place while one leaves (a React warning in the console said so); they do now.
- **A member who was renamed (or signed up by their Discord username) showed up twice in "Wie gaan er mee".**
  Sign-ups store names, so someone on Saturday under their Discord username and on Sunday under their name was two
  names on the list, each with one day, instead of one person with "Alle dagen". They are now one person everywhere
  a trip's people are shown or counted: the list, the avatars and "Jij en 3 anderen" on the tickets, the Hub card,
  the recap, and the checks for who is missing a ride, a meal or a hotel room or is only there some days (a ride
  or room listing them under either name counts).
- **Reloading an admin page sent you to the Hub.** While the app was still restoring its saved data, the admin
  check read "no answer yet" as "not an admin". It now waits for the answer.
- **The "Iemand aanmelden" button in the participants list had no styling** (plain text on a bare strip); the
  quiet button style it relied on did not exist. It does now, and so does the same button on the trip switcher
  and the CDN page.
- **The search no longer slides under the tab bar** on a phone, so the last results can be reached.
- **Cut-off and squeezed bits on small phones (320 px wide):** the "Locatie pingen" button on Crew, the sign-up
  count on an activity, the day cards (the tick no longer sits on "DI NOV"), the settle-up and ritkosten rows (the
  title was cut to a dozen letters; the status pill now sits under it), the route card of a ride, the cosplay
  toolbar and its date pills, the arrival and departure list of a hotel, the "Nieuw" label under your story.
- **The story row now runs to the edge of the screen** instead of stopping 16 px short.
- **The swipe hint for other trips sits above the tab bar** instead of over the banners at the top, and has no shadow.
- **Admin on a phone:** the whitelist's delete buttons were pushed off the screen by long addresses, the new-day
  row of the event drawer lost its buttons, event rows on the dashboard collapsed to one letter, the header
  buttons wrapped and clipped, and the menu drawer left a shadow strip along the screen edge.
- **A restaurant ride without a named organiser no longer shows an empty "?"** under the title.
- **Compact density now also tightens half steps** (gaps and paddings like 1.5 and 2.5), which it silently skipped.

### Changed

- **Calmer screens:** the "what's new" bar is a soft blue strip instead of a solid blue one, and it only shows when
  there is no announcement, so the top of a phone screen holds one bar at most; the hotel sheet is a plain list
  divided by lines instead of a card inside the sheet; the "Installeren" button and the iPhone steps line up with
  the text of the install card instead of sitting under its icon; the one-time swipe hint is a dark pill instead of
  an outlined card; the Praktisch sheet has no icons in front of some of its headings and no extra side
  indent, so every heading starts at the same edge and the text gets the full width; the days on the Hub card are written like the days on the event page (`DI OKT`); a cosplay
  card lists its days in one line (`DI 27 · DO 29 OKT`) instead of a box per day; the place of an activity is no
  longer in capitals; the profile page has the same title bar as the other pages ("Profiel") instead of repeating
  the name; the admin dashboard's "Alle evenementen" no longer wraps and long places end in "…" instead of being
  cut off. Warning and success notices share one look (`notice-warn`, `notice-ok`).
- **Easier to hit:** the close button on the announcement and "what's new" bars, the dots and arrows of the Hub
  carousel, "N gaan mee", "Nog N tonen", the back and home buttons, the avatar in the header and the switches
  all have a 44 px area to tap (they look the same).
- **Buttons that cannot be pressed yet look flat and grey** instead of a washed-out blue block with a grey outline.
- **One switch everywhere** (Instellingen and Meldingen used two different ones).
- **The admin tables turn into cards on a phone.** Users, rides, activities, events, badges, announcements and the
  changelog no longer need sideways scrolling to reach edit and delete: each row is a card with the name on top and
  the status and buttons below. The page headers say which part of the admin you are in, and their buttons share
  the full width on a phone. Admin buttons are all at least 44 px tall.
- **Greyer text is easier to read.** The muted grey is a shade darker (and lighter in dark mode), enough for small
  text to be readable; the same grey as before, just with more contrast.
- **The same look for the same thing:** one status pill (green = fine, amber = waiting for you, red = you owe),
  one filter chip, one label and error style for forms. "Te betalen" is now red everywhere (it was grey in the
  expense details). Popups ("Aanmelden", "Aankondiging", cancel a ride) are sheets like everything else, instead of
  full-screen pages.
- **The Hub card of a short event no longer has a big empty gap** (it was stretched to the height of the tallest one).
- **Accent colours** no longer leave one lonely colour on the second row.

---

## [2.1.4] - 2026-10-20

The back gesture closes a story instead of leaving the app, and a home server that is off shows an error
within seconds instead of after a minute. The Cloudflare Worker needs deploying again for the second one
(`npx wrangler deploy` in `cloudflare/`). No migrations.

### Fixed

- **Back gesture closes the story instead of leaving the app.** A story, a photo opened big on a profile,
  a profile card, the banner crop and the "Grote video" question now each take their own step in the history,
  like a sheet already did. Before, opening a story as the first thing in the app left nothing for the back
  gesture to step back over, so it left the app.
- **A server that is off no longer means a minute of spinner.** The Cloudflare page now appears after 8
  seconds instead of up to 100 (it needs `npx wrangler deploy` once). An installed app, or one visited before,
  opens on its saved data instead of an error page. Reading from the app gives up after 15 seconds instead of 30,
  and a long wait on the loading screen says "De server reageert traag" after 6.
- **Deleting a story file from the admin CDN page also removes its thumbnails** when its database row is already
  gone (after its event was deleted, say); the copies are found by name.

---

## [2.1.3] - 2026-10-15

Photos and covers that load lighter, a phone pass (bigger touch areas, readable text, the right keyboards,
press feedback), a card that helps put the app on the home screen, and a story timer that
respects reduced motion. Needs migration v2.41 (see `TODO.md`) and, for what is already uploaded, two
scripts (`scripts.backfill_story_previews`, `scripts.shrink_event_covers`).

### Added

- **"Zet Ankerd Con op je beginscherm."** On a phone, a card on the Hub (and a row in Instellingen) helps
  install the app: one tap on Android, the two Share-menu steps on iPhone, where an installed app is also
  what makes push messages possible. "Sluiten" hides it for 30 days.
- **Swipe a message sideways to dismiss it.** The little messages ("Opgeslagen") can be swiped away, and a
  screen reader reads them out.

### Changed

- **Easier to hit on a phone.** About 90 small buttons (close, copy, delete, switches) now have a touch
  area of at least 44 px without looking any different. A tap on a phone no longer leaves a button looking
  pressed (hover styles only apply where the device can hover), and whatever you press dims for a moment
  so you can see it registered.
- **Text is no longer tiny.** Labels, chips, hints and the tab bar were 9 to 11.5 px in about 150 places;
  they are 12 px now. (The initials in a small avatar circle keep their size.)
- **Lighter on mobile data.** Event covers are saved as at most 1600 px of WebP instead of the up to 10 MB
  they came as; profile pictures ask Discord and Google for the size they are shown at instead of the
  full-size file; and pictures lower on a page only load when you get there. Covers uploaded earlier shrink
  with a script (see `TODO.md`).
- **Fewer surprises with the keyboard.** Amount fields open a keypad with a decimal point, counts a plain
  number pad, search boxes say "Zoek" on the Enter key, and the place fields of the quick ride and the
  global search no longer make iPhones zoom in.
- **Full-screen pages fit the visible screen on iPhone** (the meal and ride pages, the admin) instead of
  running under Safari's toolbar.
- **Animations follow "reduce motion".** If a phone is set to reduce motion, transitions are skipped. The
  story timer, which used to be an animation, now runs on its own so it still moves on.
- **Photos load much lighter.** Grids (profiles, the trip look-back, the story ring) used to load every
  photo at full size, up to 2560 px and about a megabyte each, which adds up on mobile data. Each photo now
  has a small thumbnail for grids and, when it is big, a 1280 px preview for the story viewer, made when it
  is uploaded. Download, the day's zip and Delen still give the full original. Photos added before this show
  the original until their copies have been made (see `TODO.md`). Needs migration v2.41.

---

## [2.1.2] - 2026-10-15

Videos in stories, read-only members (kijkers), what passengers owe the driver (ritkosten), calmer
notification settings, sheets that stack over each other, and a faster onboarding and notification
card. Needs migrations v2.36 to v2.40 (already run on the live database).

### Added

- **Videos in stories.** Add a video (MP4, MOV or WebM, up to 80 MB) to a story the same way as a
  photo, alone or mixed with photos. It plays full screen with sound (a speaker button if the browser
  starts it muted), the progress bar follows the video and the story moves on when it ends. Videos
  show up in the profile and trip photo grids with a play badge. Videos are not compressed: one over
  80 MB is refused straight away, and one over 25 MB asks first (it can take long on mobile data).
  A video needs migration v2.40.
- **Read-only members ("kijkers").** Someone can now be allowed to look at the app but not take part, and
  still has to be on the whitelist: tick **Alleen kijken** on the whitelist entry (or on a member under
  Admin → Gebruikers). They see everything, get a slim "Je kunt alleen meekijken" bar, and no buttons to
  sign up, offer a ride, add an activity, expense, cosplay or photo, share a location or a parking
  spot. The server refuses every change they try anyway, apart from their own settings, notifications,
  feedback and watching stories. Admins are never read-only. Needs migration v2.39.
- **Notification settings, tidied.** The categories are grouped (Evenementen, Plannen), with a quick choice
  on top (Alles, Alleen belangrijk, Niets). A new switch **"Alleen mijn trips"**, on by default, limits the
  notifications for new activities and expenses to the trips you are going on (rides already worked that
  way). The channel card has a **Testmelding** button that sends you one message, so you can see it
  arrive. Betaalverzoeken are listed as always on. Needs migration v2.38 to change the switch.
- **Ritkosten: what passengers owe the driver.** In Financiën, under Afrekenen, a driver enters what the
  trip cost them (fuel, tolls and parking in one amount) and sees what each passenger owes. One simple
  rule: **everyone pays the driver of the first ride they took to the trip**, and the amount is shared
  equally by the driver and the people in that car. Switching cars later in the trip changes nothing, so
  nobody ends up with a list of tiny amounts. It is an overview, not a payment: ask for it with a Tikkie.
  Passengers see "Jij betaalt <naam>". Needs migration v2.37.
- **"Vertel wat er gebeurde" on the crash screen ("Er ging iets mis").** One tap opens a small box;
  what you write goes to Admin → Feedback as a bug, with the page and the technical message added
  automatically. It is on that screen only: the others cannot use it (the server is unreachable, you
  are not signed in, or the app did not start).

### Fixed

- Settings → Notificaties said "Kies welke Discord DM's je ontvangt"; it now says you choose how
  (Discord or push) and for what.
- **The "Meldingen via" card (Discord or push) took seconds to appear** in the notification settings and
  in onboarding: nothing was shown until the app had asked the browser whether this device is
  subscribed, and it did that by waiting for a service worker, which never arrives in a dev build and
  can be slow on a first visit (it gave up after 8 seconds). The card now shows at once; what is
  already known (no push here, install the app first, blocked) is there immediately, and only the
  Pushmeldingen row says "Even kijken…" for a moment. The lookup asks for the registration that
  exists instead of waiting for one, and gives up after 1.5 seconds.
- **The onboarding test screen (Admin → Preview: Onboarding) was a copy of the real onboarding,
  not the real thing**, and had drifted: the progress bar was another colour, the done screen
  another button. Both now render the same flow (`OnboardingFlow`); the test screen only differs in
  that nothing is saved and "done" leads back to the admin panel.
- **New members never saw the done screen ("Je bent er klaar voor!")**: saving marked them as
  finished, and the page that sends finished members to the hub did so at once. It no longer does
  while they are finishing it.
- The done screen pointed to a "Meer" page that no longer exists; it says Instellingen under your
  avatar now.

### Added

- **Admins can get a notification for new feedback.** Under Instellingen → Notificaties admins have an
  extra switch, "Nieuwe feedback", that only they see. It sends a Discord DM or a push (whichever you
  use) with the kind, the message (shortened) and who sent it; an anonymous message names nobody.
  Anyone who is not an admin cannot switch it on, and stops getting it if they stop being one.

### Changed

- **A sheet that opens over another sheet no longer hides it.** The one underneath slides down to just above
  the new one and shows only its top bar, dimmed, like a page laid over a page; closing the new sheet
  (tap the dimmed area, Escape or back) brings the first one back. It applies to every sheet that opens over
  another, such as "Ik rijd" in Vervoer or bulk rooms in Kamers.
- **The admin CDN page loads a screenful at a time** (24 files, whole rows) and fetches more as you
  scroll down, instead of asking for 60 at once and then everything again on "Toon meer". Videos
  fetch their first frame only when they come near the screen. Paging through the viewer keeps
  loading ahead.

- The hub's "Rit aanbieden" no longer says "Naar hotel" / "Naar evenement" on a hotel trip: the switch
  and the title say **Heen** and **Terug** like everywhere else, since on the last day Terug goes
  home, not to the hotel. The tile's grey line says "Naar huis" then too, and "Naar hotel" only on
  days before the last.
- The hub's "Rit aanbieden" and "Meerijden" switch to tomorrow's ride to the event from 20:00 (was
  21:00), in the evening of a day that is not the last.

---

## [2.1.1] - 2026-10-08

Activities (a meal is now one kind of activity), a faster and steadier backend, a calmer Vervoer
with the hotel filled in, and fixes to the weather card and the error screen. Needs migration
v2.36 (see `TODO.md`).

### Fixed

- **The weather card said "Geen weersdata beschikbaar" for events more than about two weeks away**
  instead of the usual average for that date. Since the weather moved through the backend, the
  forecast service's answer for a date out of range (a 400, not an empty forecast) was treated as a
  failure, so the app never fell back to the average of the past ten years. The backend now passes
  that on as "no forecast yet".
- **The weather card showed another country's weather for some events.** It looked the event up by
  name again, and when "Brussel Expo" found nothing it tried single words: "Expo" matched a village
  in Virginia, so HMIA Brussels showed 29° for a Saturday in October (Brussels: 14°). It now uses
  the coordinates the event was saved with (from its address or Maps link), and only searches by
  name for an event that could not be placed.
- **The site sometimes hung for minutes** (the admin CDN page too), a refresh did not always help,
  and it went away by itself. The backend shared one long-lived connection to the database for
  everything and waited up to 120 seconds on it, so a connection that died quietly stalled every
  request. It now uses ordinary connections, gives up on a database call after 5 seconds to connect
  and 20 to answer, and sends a read again once on a fresh connection when the first one was dead.
- Saving or editing an activity or an event in the admin panel waited for the database on the
  server's main thread, so one slow query froze every other request. It now runs on a worker thread
  like the rest.
- The admin CDN page listed the whole photo storage again on every click. The listing is now kept
  for 45 seconds, and dropped at once when a file is added or removed.
- Slow requests (1.5 seconds or more) are now written to the log with how many others were in
  progress, and every API answer carries a `Server-Timing` header, so the next time it feels slow
  there is something to look at.

- **The "Er ging iets mis" screen could not be left.** Both buttons only reloaded the page, which
  read the same saved data back in and crashed the same way, so for some members it came back
  every time. "Probeer opnieuw" and "Terug naar start" now throw away what the app saved on the
  device (the offline copy and the cached data, not your login or settings) and start from the
  server. The saved data is also dropped as soon as the screen appears, and a new build never
  reads the saved data of the previous one (before, a hotfix with the same version number did).
  The screen shows the technical message, so a screenshot says what went wrong.
- The "Nieuwe versie / Herladen" banner and toasts could sit on top of the error screen; the
  error screen is now above everything.
- When the browser blocks storage, a crash showed a blank page instead of the error screen.

### Added

- **Activiteiten.** The Eten tile is now Activiteiten: besides a meal, anyone can plan bowling,
  Jeopardy, a concert or the group photo. Each one has a soort, picked when planning it. The soort
  decides what you fill in and what the page has: a meal has a price, a menu and dietary wishes,
  bowling has a price and a car, Jeopardy only signing up, and the group photo just a time and a
  place, without signing up. Existing etentjes are the soort Eten and look the same.
- **Admins manage the soorten** under Admin → Activiteiten → Categorieën: add, rename, reorder and
  delete them, and switch per soort *Aanmelden*, *Prijs*, *Vervoer* and *Telt als eten* on or off.
  Eten, Activiteit, Groepsfoto, Spel, Con and Concert are there to start with. A soort that
  activities still use cannot be deleted. Needs migration v2.36.

### Changed

- Whoever planned an activity, or an admin, can now **delete** it from the same pencil that edits it. It
  asks first and says how many sign-ups go with it; the ride to its restaurant, if there is one, is
  removed too.
- Notifications and search say "activiteit" instead of "etentje": "Nieuwe activiteit", and
  "Activiteit toevoegen" (also found by "eten", "diner", "bowlen", "groepsfoto") in the search.
- "Nergens bij" only counts meals: being at the bowling alley is not having dinner.
- **A new ride knows about the hotel.** On a trip with a hotel, Heen on any day after the first
  starts at the hotel (you slept there), and Terug on any day before the last ends at the hotel.
  The first Heen and the last Terug stay empty: that is from and to home. This holds in the Vervoer
  sheet and in the hub's "Rit aanbieden" (which used to put the hotel on the first and last day
  too, and looks at the day you pick). Typing in a location yourself is never overwritten.
- **Meerijden on the hub looks like Vervoer.** The sheet is one day at a time (day chips on a trip
  of several days, with the amber dot for days that still miss a ride), Heen and Terug under each
  other with a row per ride, your own in blue, and Stap in one tap away, instead of the old cards
  that needed a selection first. The way you are probably going (from the time of day) is scrolled into view.
- **The cars to an activity look like Heen and Terug.** Under Activiteiten in Vervoer each car was
  still the old card with an avatar and a footer, next to the compact rows of Heen and Terug. They
  are rows now too: time, driver and who rides along, seats free on the right, your own car in blue,
  and Stap in / Uitstappen one tap away.
- **Vervoer names who still has to make a ride.** Under Terug (and Heen) a line lists the drivers
  who planned the other way but not this one, so you no longer have to go through every driver to
  find out who has not made a return ride yet. The summary line ("4 mensen · 1 auto · 5 plekken"
  and its yellow warning) is gone: the warning is already at the bottom of the sheet.
- **Vervoer shows Heen, Terug and Eten under each other** instead of behind a switch: three
  sections per day, each with its own "Rit aanbieden". The sheet still opens on the day the
  Hub's tiles would use and scrolls to the right section.

---

## [2.1.0] - 2026-10-05

A calmer Vervoer, parking spots on the crew map, push notifications, a search that finds things to
do, and a lot of small fixes. Every migration up to v2.35 has to have been run (see
`docs/deployment.md`).

### Fixed

- Drawers (Vervoer, Kamers, Cosplay, and a payment opened from a Discord link) could not be closed
  with the X, by tapping beside them, or with Escape: they closed and immediately reopened. Caused by
  the 2.0.2 back-gesture fix.
- Tapping beside a drawer to close it did nothing on iPhones.
- A member's avatar was only ever fetched once, the first time it was empty, and then frozen
  forever — if their Discord or Google picture later changed, or the stored image stopped
  resolving, the app kept showing the broken one with no way to recover. It is now re-checked
  once a day and replaced when it differs. Needs migration v2.29.
- Saving Profiel always showed the generic "Kon profiel niet opslaan." even when the backend said
  exactly why (a name already taken, an invalid phone number, …) — it was reading the error in a
  shape the API client stopped producing a while ago. The real reason shows now.
- The trip page's Eten card only ever showed the first 3 meals and never the rest, with no way to
  reach them; a meal never left the list either, however long ago it happened. It now shows every
  meal, and drops one from the list (not from the trip) 3 hours after it starts — the same rule
  the Hub's meal card already used.
- The Foto's tile on the trip page put its own upload button inside the tile's outer button — invalid
  HTML a browser "fixes" by silently splitting the two apart, which could make clicks land wrong.
  The tile is a div now, styled and behaving the same either way.
- The "Nog geen rit georganiseerd" box on a meal page (when it needs transport) is a button, but
  looked like a plain warning banner — nothing said it was tappable. It now spells out "Tik om een
  auto aan te bieden" and ends in a chevron, like other tappable rows in the app.
- A push notification's title repeated itself at the start of its own text ("Nieuwe maaltijd" /
  "Nieuwe maaltijd: Pizza") for new meals and new events — the body no longer repeats what the
  title already says.
- Story rings and photos lagged behind: opening a story could show the previous photo until you
  reopened it, because the day's photo list was cached for up to 30 seconds while the ring already
  knew about the new one. The viewer now always asks again when it opens, the rings refresh every
  minute, and the next photos are loaded ahead so tapping through is instant.
- On desktop the story viewer could slide down and leave a gap of a few hundred pixels showing the
  background: dragging a photo with the mouse started the browser's own image drag. Swiping down to
  close is for touch only now, and photos can't be dragged.
- The onboarding colour list (and the profile's) had orange twice — amber and orange looked the
  same. One is left.
- The Parkeerplek button on Crew is always there now, so people know the option exists; while it
  can't be used it is greyed out and tapping it says why.

### Added

- **A chemistry joke on every error screen**, from soc.ankerd.nl, in Dutch: under "Er ging iets
  mis", "Pagina niet gevonden", "Geen toegang", "Kan de server niet bereiken" and "Ankerd Con kan
  niet starten".
- **Add several photos to a story at once.** Pick as many as you like (up to 30); they go in
  one after the other in the order they were taken (read from the photo, or the file's date when it
  has none), with a count while they upload and one message at the end. A lost connection queues
  the rest to send later.
- **Search finds things to do**, not just things: "Acties" cards such as Locatie pingen, Parkeerplek
  opslaan, Rit aanmaken and Etentje plannen, found by everyday words too ("lift", "diner", "ping",
  "geparkeerd"). Those that belong to a trip act on the current trip — the one the Event tab opens
  on — and the card says which. Each opens the right sheet straight away.
- Drawers can be closed by swiping down on the pill or the header; story photos by swiping down
  anywhere (the photo follows your finger, then springs back or closes).
- Download a whole day's photos as one zip from the story viewer, next to the per-photo download.
- When the app cannot start (an old iPhone, a stale cached copy) it now shows a "Ankerd Con kan niet
  starten" screen with what to try and the errors it saw, instead of a blank white page.
- The weather card used to have every member's browser call Open-Meteo directly — now it goes
  through the backend, which caches the response, so a burst of people opening the app around the
  same time shares one fetch instead of one each.
- **Parkeerplek**: mark where a driver's car is parked on the crew map (Crew → Parkeerplek, next
  to Locatie pingen) — a 🚗 pin anyone riding with that driver can set or correct. Tapping it shows
  when that car is leaving and links to the ride, once one's been planned; it drops off the map 2
  hours after that. Needs migration v2.35.
- Whoever planned a meal — or an admin — can now edit it afterwards: a pencil next to the share
  button on the meal page, same as the event page's.
- **Profielfoto en banner**: upload your own (Profiel) — a pencil on the photo and another on the
  banner, JPG/PNG/WebP or a small GIF — instead of only the one Discord or Google gives you for
  the avatar. Deleting one is now a small trash icon next to its pencil, not a text link. Both are
  also settable during onboarding, not only afterwards. Needs migration v2.30.
- **Event tags**: an event can be tagged Con, Gathering or Concert (Admin → Evenementen), shown at
  the top of its ticket card — replaces the old "Feestje" checkbox. Needs migration v2.32.
- **Instellingen → Dichtheid**: a comfortable/compact toggle that tightens spacing app-wide.
- **Pushmeldingen**: a notification channel next to Discord DMs, per device — the one that also
  works for members who signed up with Google and have no Discord DM channel at all. Needs
  migration v2.31 and a VAPID key pair (see docs/deployment.md#web-push); it simply isn't
  offered until that's set up.
- **Notificaties** (Instellingen, and a step in onboarding) now asks for one channel — Discord
  or Pushmeldingen, never both — instead of two separate switches; the category list underneath
  is unchanged and governs whichever channel is picked. Only a channel that's actually usable is
  offered (Discord needs a linked account, push needs browser support).
- A pushmelding's title is now what it's about ("Nieuwe maaltijd", "Betaalverzoek", …) instead of
  always "Ankerd Con" — the phone already shows the app's own name and icon next to it.
- A new ride's notification now only reaches members signed up for that day who don't already have
  a ride for the same need (the same direction that day, or for a restaurant ride, a ride to that
  same meal) — it used to go to everyone with "Nieuwe rit" on, regardless of whether they were even
  going or already sorted.
- **Crew map**: the con location, hotel and each dinnerplan now show up as their own pins, always —
  not only once someone's shared a live location. A location is geocoded automatically when saved;
  when that doesn't land on the right spot (a hotel chain resolving to the wrong city, say, or not
  at all), a dinnerplan or, in Admin → Evenementen, the con/hotel location can carry its own exact
  Google Maps link instead, which places the pin itself. Needs migrations v2.33 and v2.34.
- Signing several people up for a day (or into a hotel room) is now one request instead of one per
  person — it used to visibly crawl one name at a time for a bigger group.
- The launch splash no longer holds for a fixed ~4.5 s regardless of how ready the app already is;
  it's now a brief brand moment (~1.5 s total).

### Changed

- **Vervoer is calmer.** The sheet used to stack a card per ride (eight things on each) inside a
  collapsible per day, under three "Ik rijd" buttons and an amber banner. It now shows one
  direction of one day at a time: pick Heen, Terug or Eten at the top and, on a multi-day trip, the
  day below it. Each ride is a single row; tap it for who rides along, the parking info and Stap
  in / Uitstappen. **Your own ride is the blue row**, the others are greyed back, and every row
  shows how full the car should leave ("doel 3–4"). "Rit aanbieden" sits next to the day chips,
  and "N mensen hebben nog geen vervoer" is one line at the bottom. The sheet opens on the
  direction and day that are next up, the same way the Hub's "Rit aanbieden" and "Meerijden" tiles
  decide. The Tijdlijn view is gone: the list is already in time order.

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