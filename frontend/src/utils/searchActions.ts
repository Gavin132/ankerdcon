import type { RouteAction } from "../hooks/useRouteAction";

/**
 * The "Acties" cards in the global search: things a member can *do*, found by
 * what they'd call it ("ping", "lift", "diner") rather than by where it lives.
 * The matching is here, plain and testable; GlobalSearch decides where each one goes.
 */
export type SearchActionId = "ping" | "parking" | "ride" | "meal" | "rooms" | "cosplay" | "photos" | "finance";

export interface SearchActionDef {
  id: SearchActionId;
  label: string;
  /** What it does, shown under the label. */
  hint: string;
  /** Other words people look for it with (Dutch and English, no need to repeat the label). */
  aliases: string[];
  /** Belongs to a trip, so it is done on the current one and hidden when there isn't one. */
  needsTrip: boolean;
  /** Only worth offering while the trip can still be changed. */
  needsOpenTrip?: boolean;
  /** What to ask the page to open on arrival, if anything. */
  route?: RouteAction;
}

export const SEARCH_ACTIONS: readonly SearchActionDef[] = [
  {
    id: "ping",
    label: "Locatie pingen",
    hint: "Laat de crew zien waar je bent",
    aliases: ["ping", "locatie delen", "waar ben ik", "waar zijn jullie", "positie", "location", "gps", "live locatie"],
    needsTrip: false,
    route: "ping",
  },
  {
    id: "parking",
    label: "Parkeerplek opslaan",
    hint: "Bewaar waar de auto staat",
    aliases: ["parkeren", "parkeerplaats", "geparkeerd", "auto neergezet", "waar staat de auto", "parking", "garage"],
    needsTrip: false,
    route: "parking",
  },
  {
    id: "ride",
    label: "Rit aanmaken",
    hint: "Bied een rit aan of vraag er een",
    aliases: ["rit aanbieden", "rit toevoegen", "ik rij", "rijden", "meerijden", "lift", "vervoer", "carpool", "auto", "ride", "plek in de auto"],
    needsTrip: true,
    needsOpenTrip: true,
  },
  {
    id: "meal",
    label: "Etentje plannen",
    hint: "Maak een maaltijd aan",
    aliases: ["eten", "maaltijd aanmaken", "etentje aanmaken", "diner", "lunch", "ontbijt", "restaurant", "meal", "uit eten", "food"],
    needsTrip: true,
    needsOpenTrip: true,
    route: "addMeal",
  },
  {
    id: "rooms",
    label: "Hotelkamers",
    hint: "Wie slaapt waar",
    aliases: ["kamer", "kamers", "hotel", "slapen", "overnachten", "kamerindeling", "room"],
    needsTrip: true,
  },
  {
    id: "cosplay",
    label: "Cosplay toevoegen",
    hint: "Meld wat je draagt",
    aliases: ["cosplays", "kostuum", "outfit", "character", "personage", "verkleden"],
    needsTrip: true,
  },
  {
    id: "photos",
    label: "Foto's van de trip",
    hint: "Bekijk of voeg foto's toe",
    aliases: ["foto", "fotos", "story", "stories", "uploaden", "camera", "plaatjes", "photos"],
    needsTrip: true,
  },
  {
    id: "finance",
    label: "Kosten en afrekenen",
    hint: "Uitgaven toevoegen of verrekenen",
    aliases: ["geld", "betalen", "uitgave", "uitgaven", "afrekenen", "tikkie", "verrekenen", "bonnetje", "expense", "settle up", "schuld"],
    needsTrip: false,
  },
];

export interface ActionContext {
  hasTrip: boolean;
  /** The current trip is over, so adding rides or meals to it makes no sense. */
  tripOver: boolean;
  hasHotel: boolean;
  hasCon: boolean;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "") // accents don't matter
    .replace(/[^a-z0-9 ]+/g, " ") // "foto's" -> "foto s"
    .replace(/\s+/g, " ")
    .trim();
}

/** Every word typed must start a word of the label or an alias, so "loc pi" finds "Locatie pingen". */
function matchesAction(action: SearchActionDef, query: string): boolean {
  const words = normalize([action.label, ...action.aliases].join(" ")).split(" ");
  return query.split(" ").every((token) => words.some((w) => w.startsWith(token)));
}

/** The actions that fit what was typed and can be done right now, label matches first. */
export function matchSearchActions(query: string, ctx: ActionContext): SearchActionDef[] {
  const q = normalize(query);
  if (!q) return [];
  return SEARCH_ACTIONS.filter((a) => {
    if (a.needsTrip && !ctx.hasTrip) return false;
    if (a.needsOpenTrip && ctx.tripOver) return false;
    if (a.id === "rooms" && !ctx.hasHotel) return false;
    if (a.id === "cosplay" && !ctx.hasCon) return false;
    return matchesAction(a, q);
  })
    .map((a) => ({ a, exact: normalize(a.label).startsWith(q) }))
    .sort((x, y) => Number(y.exact) - Number(x.exact))
    .map((x) => x.a);
}
