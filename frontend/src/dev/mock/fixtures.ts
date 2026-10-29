// The made-up data behind mock mode: one friend group, a handful of trips and everything that hangs off them
// (activities, rides, rooms, expenses, photos). It is deliberately a little awkward: long names, a very long
// activity title, a full car, a trip that is only partly attended, an empty list, so layout problems that
// short tidy data never shows have something to show up on.
import type {
  Announcement, Badge, CalendarEvent, ChangelogEntry, Cosplay, Event, EventDay, Expense, Feedback, HotelRoom, Meal, MealCategory,
  ParkingSpot, Ride, RideCostOverview, SettleUpOverview, StoryDaySummary, StoryPhoto, User, UserStoryPhoto, WhitelistEntry,
} from "../../types";
import { avatarImage, badgeImage, coverImage, photoImage, thumbImage, wideImage } from "./images";
import { ago, dateKey, mealTime, rideTime } from "./time";

export type Scenario = "upcoming" | "live" | "past";
export type Role = "member" | "admin" | "viewer";

export const ME = "Gavin";

const EXPO = { lat: 50.8957, lng: 4.3418 };
const HOTEL = { lat: 50.8466, lng: 4.3528 };

function user(id: string, name: string, extra: Partial<User> = {}): User {
  return {
    id, name, phone_number: "", hotel_room: "", live_location_ping: "", color: "", font: "default", bio: "",
    banner_color: "#57B2F9", pronouns: "", discord_username: name.toLowerCase().replace(/\s+/g, ""),
    is_admin: false, is_active: true, onboarding_completed: true, allow_dm: true, show_greeting: true,
    aliases: [], badge_ids: [], notification_categories: [], notify_own_trips_only: true, created_at: ago(300), ...extra,
  };
}

export function buildUsers(role: Role): User[] {
  return [
    user("u-gavin", ME, {
      is_admin: role === "admin", is_viewer: role === "viewer", color: "#7C3AED", phone_number: "+31 6 12345678",
      bio: "Maakt de app. Rijdt graag, kookt liever niet.", pronouns: "hij/hem", aliases: ["Gav"], badge_ids: ["b1", "b2"],
      banner_color: "#0D75D1", discord_username: "gavin132",
    }),
    user("u-sam", "Sam", { color: "#0D75D1", aliases: ["samdraws"], badge_ids: ["b1"], bio: "Tekent, rijdt, vergeet sleutels." }),
    user("u-alex", "Alex", { color: "#1FA971", avatar_url: avatarImage(150, "A") }),
    user("u-noor", "Noor", { color: "#E89B0C" }),
    user("u-jelle", "Jelle", { avatar_url: avatarImage(20, "J"), badge_ids: ["b3"] }),
    user("u-fenna", "Fenna", { color: "#BE123C" }),
    user("u-daan", "Daan"),
    user("u-lotte", "Lotte", { color: "#0F766E", pronouns: "zij/haar" }),
    user("u-bram", "Bram"),
    user("u-marsh", "Marshxmallow.fluff", { discord_username: "marshxmellow.fluff", aliases: ["indra"], color: "#BE185D" }),
    user("u-long", "Isabella-Maria van der Berg-Oosterhuis", { color: "#4338CA", bio: "Een bio die lang genoeg is om op een smal scherm over meerdere regels te lopen en te laten zien wat er dan gebeurt met de rest van de pagina." }),
    user("u-dark", "Xx_DarkLord_xX", { color: "#0F1519" }),
    user("u-emma", "Emma", { avatar_url: avatarImage(280, "E") }),
    // Made by an admin ahead of time, never logged in: what "Voeg samen met…" is for. One is on a trip day, one has a long name.
    user("u-tess", "Tess", { is_active: true, discord_username: undefined, is_placeholder: true, is_first_login: true }),
    user("u-placeholder-long", "Mevrouw Jansen-van-der-Heijden (gast van Sam)", {
      discord_username: undefined, is_placeholder: true, is_first_login: true,
    }),
  ];
}

const NAMES = ["Sam", "Alex", "Noor", "Jelle", "Fenna", "Daan", "Lotte", "Bram", "Marshxmallow.fluff", "Isabella-Maria van der Berg-Oosterhuis", "Xx_DarkLord_xX", "Emma", "Tess"];

export const CATEGORIES: MealCategory[] = [
  { id: "c-eten", name: "Eten", sort_order: 1, has_signup: true, has_cost: true, has_transport: true, is_meal: true },
  { id: "c-act", name: "Activiteit", sort_order: 2, has_signup: true, has_cost: true, has_transport: true, is_meal: false },
  { id: "c-foto", name: "Groepsfoto", sort_order: 3, has_signup: false, has_cost: false, has_transport: false, is_meal: false },
  { id: "c-spel", name: "Spel", sort_order: 4, has_signup: true, has_cost: false, has_transport: false, is_meal: false },
];

export interface Fixtures {
  me: User;
  users: User[];
  calendar: CalendarEvent[];
  meals: Meal[];
  rides: Ride[];
  rooms: HotelRoom[];
  expenses: Expense[];
  settle: SettleUpOverview;
  rideCosts: RideCostOverview;
  cosplays: Cosplay[];
  badges: Badge[];
  announcements: Announcement[];
  changelog: ChangelogEntry[];
  parking: ParkingSpot[];
  storyDays: Record<string, StoryPhoto[]>;
  storySummary: Record<string, StoryDaySummary>;
  whitelist: WhitelistEntry[];
  feedback: Feedback[];
  mainTripId: string;
  mainDayIds: string[];
}

const slice = (from: number, to: number) => NAMES.slice(from, to);

export function buildFixtures(scenario: Scenario, role: Role): Fixtures {
  const users = buildUsers(role);
  const me = users[0];
  // The main trip: three days, starting in 20 days (upcoming), yesterday (live: today is day two) or 10 days ago.
  const start = scenario === "upcoming" ? 20 : scenario === "live" ? -1 : -10;

  const day = (o: Partial<CalendarEvent> & { id: string; date: string }): CalendarEvent => ({
    event_name: "", has_con: true, is_hotel: false, event_type: "con", participants: [], ...o,
  });

  const A = "trip-hmia";
  const aShared = {
    multi_day_id: A, event_name: "HMIA 2026 Brussel", is_hotel: true, event_group_id: "HMIA", event_type: "con" as const,
    location: "Brussels Expo, Place de Belgique, 1020 Brussel", location_lat: EXPO.lat, location_lng: EXPO.lng,
    hotel_location: "Hotel Ibis Brussels Expo Atomium", hotel_location_lat: HOTEL.lat, hotel_location_lng: HOTEL.lng,
    hotel_info: "Inchecken vanaf 15:00. Ontbijt is niet inbegrepen: bij de bakker om de hoek.",
    image_url: coverImage(205, "HMIA 2026"),
    description: "Het grootste anime-evenement van de Benelux. We gaan met de hele groep, slapen samen in het hotel en doen op zaterdagavond iets leuks buiten de hal. Meld je aan per dag, dan weten we wie wanneer komt.",
    website: "https://example.org/hmia", ticket_url: "https://example.org/hmia/tickets", ticket_sale_start: dateKey(start - 40),
    ticket_types: [{ title: "Dagticket", price: 24.5 }, { title: "Weekendticket", price: 42 }, { title: "VIP weekend met extra lange naam voor de lengte", price: 120 }],
    locker_info: "Kluisjes bij ingang C, € 3 muntje.", parking_info: "Parkeergarage P2, € 18 per dag. Of gratis bij het Heizelpark, 10 minuten lopen.",
    special_instructions: "Neem je ticket op je telefoon mee en je ID. Cosplaywapens worden bij de ingang gecontroleerd.",
    what_to_bring: "Powerbank, pleisters, snacks, een tas voor je cosplay.",
  };
  const days: CalendarEvent[] = [
    day({ ...aShared, id: "d-hmia-1", date: dateKey(start), participants: slice(0, 9).concat(ME) }),
    day({ ...aShared, id: "d-hmia-2", date: dateKey(start + 1), participants: slice(0, 11).concat(ME) }),
    // One person only joins the last day, one leaves early: the "some days" cases.
    day({ ...aShared, id: "d-hmia-3", date: dateKey(start + 2), participants: slice(0, 6).concat(ME, "Tess") }),
  ];
  const B = "d-gathering";
  days.push(day({
    id: B, event_name: "Gathering bij Sam thuis", date: dateKey(45), event_type: "gathering", is_hotel: false, has_con: false,
    participants: ["Sam", "Alex", "Noor", ME], location: "Lelystad", description: "Bordspellen, pizza en te veel snacks.",
  }));
  const C = "trip-hdcc25";
  days.push(
    day({ id: "d-hdcc-1", multi_day_id: C, event_name: "HDCC 2025 Winter", date: dateKey(-120), participants: slice(0, 8).concat(ME), location: "Jaarbeurs Utrecht", image_url: coverImage(10, "HDCC 2025"), event_group_id: "HDCC" }),
    day({ id: "d-hdcc-2", multi_day_id: C, event_name: "HDCC 2025 Winter", date: dateKey(-119), participants: slice(0, 8).concat(ME), location: "Jaarbeurs Utrecht", event_group_id: "HDCC" }),
  );
  const D = "trip-dokomi";
  const dShared = { multi_day_id: D, event_name: "DoKomi 2027", is_hotel: true, location: "Messe Düsseldorf", location_lat: 51.2884, location_lng: 6.7403, event_group_id: "DoKomi", image_url: coverImage(300, "DoKomi") };
  days.push(
    day({ ...dShared, id: "d-doko-1", date: dateKey(120), has_con: false, participants: slice(0, 4) }),
    day({ ...dShared, id: "d-doko-2", date: dateKey(121), participants: slice(0, 6) }),
    day({ ...dShared, id: "d-doko-3", date: dateKey(122), participants: slice(0, 6) }),
  );
  days.push(day({ id: "d-concert", event_name: "Anime Night: Live in Concert", date: dateKey(8), event_type: "concert", has_con: false, participants: [ME, "Fenna"], location: "AFAS Live, Amsterdam", image_url: coverImage(330, "Concert") }));

  const mealsBase = (o: Partial<Meal> & { id: string; meal_name: string; time: string }): Meal => ({
    location: "", cost: 0, transport_needed: false, participants: [], category_id: "c-eten", category: CATEGORIES[0], created_by: "Sam", ...o,
  });
  const meals: Meal[] = [
    mealsBase({ id: "m-dinner", meal_name: "Diner bij de Italiaan", time: mealTime(start, 19, 0), location: "Ristorante Da Marco, Rue Haute 40, Brussel", location_lat: 50.8396, location_lng: 4.3489, cost: 22.5, transport_needed: true, participants: slice(0, 8).concat(ME), linked_event_id: "d-hmia-1", description: "Reserveren voor 12 personen. Vegetarisch kan.", dietary_options: "Vegetarisch, glutenvrij op aanvraag", menu_url: "https://example.org/menu" }),
    mealsBase({ id: "m-escape", meal_name: "Escape room: De Verdwenen Anime Collectie van Professor Tanaka", time: mealTime(start + 1, 20, 30), location: "Escape Brussels", cost: 18, transport_needed: true, participants: slice(0, 5).concat(ME), linked_event_id: "d-hmia-2", category_id: "c-act", category: CATEGORIES[1] }),
    mealsBase({ id: "m-foto", meal_name: "Groepsfoto bij de ingang", time: mealTime(start + 1, 12, 0), location: "Ingang Expo", participants: [], linked_event_id: "d-hmia-2", category_id: "c-foto", category: CATEGORIES[2] }),
    mealsBase({ id: "m-brunch", meal_name: "Brunch", time: mealTime(start + 2, 10, 30), location: "Hotel", cost: 0, participants: [ME, "Sam"], linked_event_id: "d-hmia-3" }),
    mealsBase({ id: "m-pizza", meal_name: "Pizza op de bank", time: mealTime(45, 18, 0), location: "Lelystad", participants: ["Sam", "Alex", ME], linked_event_id: B, cost: 8 }),
    mealsBase({ id: "m-game", meal_name: "Mario Kart toernooi", time: mealTime(start, 22, 0), location: "Hotellobby", participants: slice(0, 6), linked_event_id: "d-hmia-1", category_id: "c-spel", category: CATEGORIES[3] }),
  ];

  const ride = (o: Partial<Ride> & { id: string; driver: string; direction: Ride["direction"]; departure_time: string; start_location: string }): Ride => ({
    vehicle_type: "Car", total_seats: 4, passengers: [], parking_info: "", end_location: null, seats_left: 0, is_full: false,
    is_public_transport: false, car_available: true, action_required: false, linked_event_id: "d-hmia-1", ...o,
  });
  const withSeats = (r: Ride): Ride => ({ ...r, seats_left: Math.max(0, r.total_seats - r.passengers.length), is_full: r.passengers.length >= r.total_seats && r.total_seats > 0 });
  const rides: Ride[] = [
    withSeats(ride({ id: "r-1", driver: "Sam", direction: "Inbound", departure_time: rideTime(start, 7, 30), start_location: "Lelystad Centrum", end_location: "Brussels Expo", passengers: ["Alex", "Noor"], total_seats: 4, parking_info: "Staat bij de Albert Heijn" })),
    withSeats(ride({ id: "r-2", driver: "Jelle", direction: "Inbound", departure_time: rideTime(start, 8, 15), start_location: "Utrecht Centraal", end_location: "Brussels Expo", passengers: ["Fenna", "Daan", "Lotte"], total_seats: 3 })),
    withSeats(ride({ id: "r-3", driver: "Fenna", direction: "Inbound", vehicle_type: "Public Transport", is_public_transport: true, departure_time: rideTime(start, 9, 2), start_location: "Amsterdam Zuid", end_location: "Brussel-Zuid", passengers: [], total_seats: 0, car_available: false })),
    withSeats(ride({ id: "r-4", driver: ME, direction: "Inbound", departure_time: rideTime(start, 9, 0), start_location: "Almere Buiten, Het Oor 12", end_location: "Hotel Ibis Brussels Expo Atomium", passengers: ["Bram"], total_seats: 4 })),
    withSeats(ride({ id: "r-5", driver: "Sam", direction: "Outbound", departure_time: rideTime(start + 2, 17, 0), start_location: "Brussels Expo", end_location: "Lelystad Centrum", passengers: ["Alex", ME], total_seats: 4, linked_event_id: "d-hmia-3" })),
    withSeats(ride({ id: "r-6", driver: "Daan", direction: "Outbound", departure_time: rideTime(start + 2, 18, 30), start_location: "Brussels Expo", end_location: "Utrecht", passengers: [], total_seats: 3, linked_event_id: "d-hmia-3" })),
    withSeats(ride({
      id: "r-7", driver: "", direction: "Restaurant", departure_time: rideTime(start, 18, 30), start_location: "Ristorante Da Marco, Rue Haute 40, Brussel", end_location: null,
      total_seats: 0, linked_meal_id: "m-dinner", linked_event_id: undefined,
      restaurant_drivers: [{ name: "Sam", seats: 4, passengers: ["Alex", "Noor", "Jelle"] }, { name: "Bram", seats: 3, passengers: [ME] }],
    })),
  ];

  const rooms: HotelRoom[] = [
    { id: "k-1", event_id: "d-hmia-1", room_number: "214", floor: "2", capacity: 4, occupants: ["Sam", "Alex", "Noor", "Jelle"], instructions: "Sleutel bij de balie" },
    { id: "k-2", event_id: "d-hmia-1", room_number: "216", floor: "2", capacity: 4, occupants: [ME, "Bram"] },
    // Sam is in room 214 and, under a former name, in this one: a room made before "one room per person" (the Hotel sheet warns).
    { id: "k-3", event_id: "d-hmia-1", room_number: null, capacity: 2, occupants: ["Fenna", "samdraws"] },
    { id: "k-4", event_id: "d-hmia-1", room_number: "305", floor: "3", capacity: 3, occupants: [] },
  ];

  const share = (id: string, expense: string, who: string, amount: number, status: "pending" | "claimed" | "confirmed" = "pending") => ({ id, expense_id: expense, participant: who, amount, status });
  const expenses: Expense[] = [
    { id: "e-1", paid_by: ME, amount: 132, currency: "EUR", description: "Hotel, 2 nachten (3 kamers) met een beschrijving die best lang mag zijn", date: dateKey(start - 3), created_at: ago(5), linked_event_id: "d-hmia-1", shares: [share("s-1", "e-1", "Sam", 33), share("s-2", "e-1", "Alex", 33, "claimed"), share("s-3", "e-1", "Noor", 33, "confirmed"), share("s-4", "e-1", ME, 33, "confirmed")] },
    { id: "e-2", paid_by: "Sam", amount: 54.8, currency: "EUR", description: "Tickets HMIA", date: dateKey(start - 30), created_at: ago(30), linked_event_id: "d-hmia-1", shares: [share("s-5", "e-2", ME, 27.4), share("s-6", "e-2", "Sam", 27.4, "confirmed")] },
    { id: "e-3", paid_by: "Alex", amount: 18, currency: "EUR", description: "Pizza", date: dateKey(-3), created_at: ago(3), shares: [share("s-7", "e-3", ME, 6), share("s-8", "e-3", "Sam", 6), share("s-9", "e-3", "Alex", 6, "confirmed")] },
    { id: "e-4", paid_by: ME, amount: 9.5, currency: "EUR", description: "Parkeren", date: dateKey(-1), created_at: ago(1), shares: [share("s-10", "e-4", "Bram", 4.75), share("s-11", "e-4", ME, 4.75, "confirmed")] },
  ];

  const settle: SettleUpOverview = {
    items: [
      { counterparty_id: "u-sam", counterparty: "Sam", direction: "i_owe", amount: 33.4, currency: "EUR", share_count: 2, blocked_by_settlement: false },
      { counterparty_id: "u-alex", counterparty: "Alex", direction: "i_owe", amount: 6, currency: "EUR", share_count: 1, blocked_by_settlement: true },
      { counterparty_id: "u-bram", counterparty: "Bram", direction: "owes_me", amount: 4.75, currency: "EUR", share_count: 1, blocked_by_settlement: false },
      { counterparty_id: "u-noor", counterparty: "Noor", direction: "even", amount: 0, currency: "EUR", share_count: 2, blocked_by_settlement: false },
    ],
    settlements: [
      { id: "st-1", from_user_id: "u-gavin", to_user_id: "u-alex", from_user: ME, to_user: "Alex", amount: 6, currency: "EUR", status: "requested", request_url: "https://tikkie.me/pay/example", iban: null, account_name: null, created_at: ago(1) },
    ],
  };

  const rideCosts: RideCostOverview = {
    as_driver: [{
      trip_id: A, driver: ME, amount: 90, group: ["Bram", "Lotte"], passengers: [{ name: "Bram", amount: 30 }, { name: "Lotte", amount: 30 }],
      own_share: 30, rides: 2, last_ride: dateKey(start + 2),
    }],
    as_passenger: [{ trip_id: A, driver: "Sam", amount: 22.5 }],
  };

  const cosplays: Cosplay[] = [
    { id: "cp-1", user_name: ME, character_name: "Monkey D. Luffy", series: "One Piece", notes: "Hoed in de maak, sandalen nog kopen.", inspo_images: [wideImage(1), wideImage(2)], linked_event_ids: ["d-hmia-1", "d-hmia-2"], created_at: ago(20) },
    { id: "cp-2", user_name: "Sam", character_name: "Zenitsu Agatsuma uit Demon Slayer: Kimetsu no Yaiba", series: "Demon Slayer", inspo_images: [wideImage(3)], linked_event_ids: ["d-hmia-2"], created_at: ago(15) },
    { id: "cp-3", user_name: "Fenna", character_name: "Makima", series: "Chainsaw Man", inspo_images: [], linked_event_ids: ["d-hmia-1", "d-hmia-3"], created_at: ago(10) },
    { id: "cp-4", user_name: "Noor", character_name: "Hatsune Miku", series: "Vocaloid", notes: "", inspo_images: [wideImage(4), wideImage(5), wideImage(6)], linked_event_ids: [], created_at: ago(8) },
  ];

  const badges: Badge[] = [
    { id: "b1", name: "Veteraan", description: "Op drie of meer evenementen geweest", image_url: badgeImage(40), display_order: 1 },
    { id: "b2", name: "Beheerder", description: "Houdt de boel draaiend", image_url: badgeImage(210), display_order: 2 },
    { id: "b3", name: "Chauffeur van het jaar", description: "Meer dan 1000 km gereden", image_url: badgeImage(120), display_order: 3 },
  ];

  const announcements: Announcement[] = [
    { id: "a-1", message: "Vrijdag verzamelen we om 07:15 bij het tankstation. Wie later komt rijdt zelf achter ons aan.", severity: "info", active: true, dismissible: true, notify_discord: false, created_at: ago(1), created_by: "Sam" },
    { id: "a-2", message: "Let op: de ingang aan de zuidkant is dicht door werkzaamheden. Loop via het hoofdgebouw, dat is ongeveer tien minuten extra.", severity: "warning", active: true, dismissible: true, notify_discord: false, created_at: ago(1), created_by: "Sam" },
  ];

  const changelog: ChangelogEntry[] = [
    { id: "cl-1", title: "2.1.4", items: ["De terug-beweging sluit een story in plaats van de app.", "Fouten tonen sneller."], released_at: dateKey(-6), created_at: ago(6) },
    { id: "cl-2", title: "2.1.3", items: ["Foto's laden lichter.", "Grotere tikvlakken op telefoons.", "Zet de app op je beginscherm."], released_at: dateKey(-13), created_at: ago(13) },
  ];

  const parking: ParkingSpot[] = [
    { id: "p-1", trip_id: A, driver: "Sam", lat: EXPO.lat + 0.002, lng: EXPO.lng - 0.003, placed_by: "Sam", created_at: ago(0) },
    { id: "p-2", trip_id: A, driver: ME, lat: EXPO.lat - 0.0015, lng: EXPO.lng + 0.002, placed_by: ME, created_at: ago(0) },
  ];

  const dayIds = ["d-hmia-1", "d-hmia-2", "d-hmia-3"];
  const storyDays: Record<string, StoryPhoto[]> = {};
  const storySummary: Record<string, StoryDaySummary> = {};
  let seq = 0;
  dayIds.forEach((id, dayIndex) => {
    const count = dayIndex === 2 ? 0 : 4 + dayIndex;
    storyDays[id] = Array.from({ length: count }, (_, i) => {
      seq += 1;
      return {
        id: `ph-${seq}`, event_day_id: id, seq, uploaded_by: NAMES[(i + dayIndex) % 6], created_at: ago(2), media_type: "image" as const,
        image_url: photoImage(seq), thumb_url: thumbImage(seq), preview_url: photoImage(seq), poster_url: null,
      };
    });
    if (count > 0) storySummary[id] = { photo_count: count, latest_seq: seq, has_unseen: dayIndex === 0, preview_url: thumbImage(seq) };
  });

  const whitelist: WhitelistEntry[] = [
    { id: "w-1", discord_id: "123456789012345678", email: null, created_at: ago(200) },
    { id: "w-2", discord_id: null, email: "iemand.met.een.erg.lang.emailadres@voorbeeld-domein.example", created_at: ago(90) },
    { id: "w-3", discord_id: "987654321098765432", email: null, viewer: true, created_at: ago(5) },
  ];
  const feedback: Feedback[] = [
    { id: "f-1", kind: "bug", message: "De knop 'Opslaan' op de ritkosten werkt niet als ik het bedrag met een komma typ en daarna op Enter druk.", user_name: "Sam", app_version: "2.1.4", status: "new", created_at: ago(1) },
    { id: "f-2", kind: "idea", message: "Kunnen we een lijstje met wie wat meeneemt?", user_name: null, app_version: "2.1.3", status: "seen", created_at: ago(4) },
    { id: "f-3", kind: "other", message: "Top app!", user_name: "Noor", status: "done", created_at: ago(9) },
  ];

  return { me, users, calendar: days, meals, rides, rooms, expenses, settle, rideCosts, cosplays, badges, announcements, changelog, parking, storyDays, storySummary, whitelist, feedback, mainTripId: A, mainDayIds: dayIds };
}

export function userPhotos(fx: Fixtures, who: string): UserStoryPhoto[] {
  return Object.values(fx.storyDays).flat().filter((p) => p.uploaded_by === who).map((p) => ({
    id: p.id, image_url: p.image_url, thumb_url: p.thumb_url, preview_url: p.preview_url, poster_url: null, media_type: "image" as const,
    created_at: p.created_at, event_day_id: p.event_day_id, event_id: fx.mainTripId, event_name: "HMIA 2026 Brussel", date: dateKey(0),
  }));
}

/** The trips as admins manage them: one event with several days, instead of one row per day. */
export function adminEvents(fx: Fixtures): { events: Event[]; days: EventDay[] } {
  const groups = new Map<string, CalendarEvent[]>();
  for (const d of fx.calendar) groups.set(d.multi_day_id ?? d.id, [...(groups.get(d.multi_day_id ?? d.id) ?? []), d]);
  const events: Event[] = [];
  const days: EventDay[] = [];
  for (const [id, rows] of groups) {
    const first = rows[0];
    events.push({
      id, event_name: first.event_name, event_group_id: first.event_group_id, is_hotel: rows.some((r) => r.is_hotel), event_type: first.event_type,
      hotel_location: first.hotel_location, location: first.location, location_lat: first.location_lat, location_lng: first.location_lng,
      description: first.description, image_url: first.image_url, website: first.website, ticket_url: first.ticket_url, created_at: ago(60),
    });
    for (const r of rows) days.push({ id: r.id, event_id: id, date: r.date, has_con: r.has_con, participants: r.participants, created_at: ago(60) });
  }
  return { events, days };
}
