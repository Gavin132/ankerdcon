import { Home, Ticket, CalendarDays, Wallet, Users, type LucideIcon } from "lucide-react";
import type { TabId } from "../types";

export const APP_NAME = "Ankerd Con";

/** Public uptime page — on its own host, so it stays up when this app is down. */
export const STATUS_PAGE_URL = "https://status.ankerd.org/";

export const QUERY_KEYS = {
  rides:     ["rides"]     as const,
  rideCosts: ["ride-costs"] as const,
  meals:     ["meals"]     as const,
  calendar:  ["calendar"]  as const,
  users:     ["users"]     as const,
  userNames: ["userNames"] as const,
  /** Prefix key — use for broad invalidation of all single-user queries. */
  userBase:  ["user"]      as const,
  /** Full key for a specific user query. */
  user: (name: string) => ["user", name] as const,
  /** Current authenticated user's own profile. */
  currentUser: ["currentUser"] as const,

  badges: ["badges"] as const,
  announcements: ["announcements"] as const,
  changelog: ["changelog"] as const,
  settlements: ["settlements"] as const,

  // Admin
  adminStats:  ["admin", "stats"]  as const,
  adminUsers:  ["admin", "users"]  as const,
  /** What merging a placeholder into a member would move. Under `adminUsers`, so every change to the users drops it. */
  adminMergePreview: (sourceId: string, targetId: string) => ["admin", "users", "merge-preview", sourceId, targetId] as const,
  adminRides:  ["admin", "rides"]  as const,
  adminMeals:  ["admin", "meals"]  as const,
  adminMealCategories: ["admin", "meal-categories"] as const,
  adminEvents: ["admin", "events"] as const,
  adminEventDays: ["admin", "event-days"] as const,
  adminBadges:       ["admin", "badges"]       as const,
  adminEventGroups:  ["admin", "event-groups"] as const,
  adminAnnouncements: ["admin", "announcements"] as const,
  adminChangelog: ["admin", "changelog"] as const,
  adminWhitelist: ["admin", "whitelist"] as const,
  adminFeedback: ["admin", "feedback"] as const,

  mealCategories: ["meal-categories"] as const,
  cosplays: ["cosplays"] as const,
  expenses: ["expenses"] as const,

  storyDay: (eventDayId: string) => ["stories", eventDayId] as const,
  storySeen: (eventDayId: string) => ["stories", eventDayId, "seen"] as const,
  storySummary: (eventDayIds: string[]) => ["stories", "summary", ...eventDayIds] as const,
  userPhotos: (identifier: string) => ["stories", "user", identifier] as const,

  hotelRooms:      (eventId: string) => ["hotel-rooms", eventId]       as const,
  adminHotelRooms: (eventId: string) => ["admin", "hotel-rooms", eventId] as const,

  parking: (tripId: string) => ["parking", tripId] as const,
};

export const STALE_TIME = 30_000; // 30 seconds

export interface NavItem {
  id: TabId;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Other path prefixes that belong to this tab (e.g. every `/trips/…` page is the Event tab). */
  activeFor?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: "hub",      label: "Hub",       path: "/",         icon: Home },
  { id: "trip",     label: "Event",     path: "/trip",     icon: Ticket, activeFor: ["/trips/"] },
  { id: "calendar", label: "Agenda",    path: "/calendar", icon: CalendarDays },
  { id: "finance",  label: "Financiën", path: "/finance",  icon: Wallet },
  { id: "crew",     label: "Crew",      path: "/crew",     icon: Users },
];

/** Whether `pathname` belongs to a bottom-nav / sidebar tab. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.path === "/") return pathname === "/";
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true;
  return (item.activeFor ?? []).some((prefix) => pathname.startsWith(prefix));
}

export const DIRECTIONS = ["Inbound", "Outbound", "Restaurant"] as const;
export const VEHICLE_TYPES = ["Car", "Public Transport"] as const;

export const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

// ─── Name picker colours ──────────────────────────────────────────────────────
// `sky` follows the accent colour (brand), `rose` is "taking someone off", `green` "adding someone".

export const TOKENS = {
  sky: {
    dot: "bg-brand",
    activeRow: "bg-brand-soft",
    chip: "bg-brand-soft text-brand-text",
    chipX: "text-brand-text/60 hover:text-brand-text",
    check: "text-brand-text",
    bar: "bg-brand",
    barFull: "bg-warn-fill",
    counter: "text-ink-3",
    counterFull: "text-warn",
  },
  rose: {
    dot: "bg-bad-fill",
    activeRow: "bg-bad-soft",
    chip: "bg-bad-soft text-bad",
    chipX: "text-bad/60 hover:text-bad",
    check: "text-bad",
    bar: "bg-bad-fill",
    barFull: "bg-warn-fill",
    counter: "text-ink-3",
    counterFull: "text-warn",
  },
  green: {
    dot: "bg-ok-fill",
    activeRow: "bg-ok-soft",
    chip: "bg-ok-soft text-ok",
    chipX: "text-ok/60 hover:text-ok",
    check: "text-ok",
    bar: "bg-ok-fill",
    barFull: "bg-warn-fill",
    counter: "text-ink-3",
    counterFull: "text-warn",
  },
} as const;

export const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
