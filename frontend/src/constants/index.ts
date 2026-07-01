import type { TabId } from "../types";

export const APP_NAME = "Ankerd Con";

export const QUERY_KEYS = {
  rides:     ["rides"]     as const,
  meals:     ["meals"]     as const,
  payments:  ["payments"]  as const,
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

  // Admin
  adminStats:  ["admin", "stats"]  as const,
  adminUsers:  ["admin", "users"]  as const,
  adminRides:  ["admin", "rides"]  as const,
  adminMeals:  ["admin", "meals"]  as const,
  adminEvents: ["admin", "events"] as const,
  adminBadges:       ["admin", "badges"]       as const,
  adminEventGroups:  ["admin", "event-groups"] as const,

  cosplays: ["cosplays"] as const,

  hotelRooms:      (eventId: string) => ["hotel-rooms", eventId]       as const,
  adminHotelRooms: (eventId: string) => ["admin", "hotel-rooms", eventId] as const,
};

export const STALE_TIME = 30_000; // 30 seconds

export interface NavItem {
  id: TabId;
  label: string;
  path: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "hub", label: "Hub", path: "/" },
  { id: "transport", label: "Transport", path: "/transport" },
  { id: "food", label: "Eten", path: "/food" },
  { id: "finance", label: "Financiën", path: "/finance" },
  { id: "more", label: "Meer", path: "/more" },
];

export const DIRECTIONS = ["Inbound", "Outbound", "Restaurant"] as const;
export const VEHICLE_TYPES = ["Car", "Public Transport"] as const;

export const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

// ─── Color tokens ─────────────────────────────────────────────────────────────

export const TOKENS = {
  sky: {
    dot: "bg-sky-500",
    activeRow: "bg-sky-50 dark:bg-sky-900/30",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    chipX: "text-sky-400 hover:text-sky-700 dark:hover:text-sky-200",
    check: "text-sky-500",
    bar: "bg-sky-400",
    barFull: "bg-amber-400",
    counter: "text-slate-400",
    counterFull: "text-amber-500",
  },
  rose: {
    dot: "bg-rose-500",
    activeRow: "bg-rose-50 dark:bg-rose-900/20",
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    chipX: "text-rose-400 hover:text-rose-600 dark:hover:text-rose-200",
    check: "text-rose-500",
    bar: "bg-rose-400",
    barFull: "bg-amber-400",
    counter: "text-slate-400",
    counterFull: "text-amber-500",
  },
  green: {
    dot: "bg-emerald-500",
    activeRow: "bg-emerald-50 dark:bg-emerald-900/20",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    chipX:
      "text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200",
    check: "text-emerald-500",
    bar: "bg-emerald-400",
    barFull: "bg-amber-400",
    counter: "text-slate-400",
    counterFull: "text-amber-500",
  },
  violet: {
    dot: "bg-violet-500",
    activeRow: "bg-violet-50 dark:bg-violet-900/20",
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    chipX: "text-violet-400 hover:text-violet-700 dark:hover:text-violet-200",
    check: "text-violet-500",
    bar: "bg-violet-400",
    barFull: "bg-amber-400",
    counter: "text-slate-400",
    counterFull: "text-amber-500",
  },
} as const;

export const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
