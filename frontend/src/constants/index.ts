import type { TabId } from "../types";

export const APP_NAME = "Ankerd Con";

export const QUERY_KEYS = {
  rides: ["rides"] as const,
  meals: ["meals"] as const,
  payments: ["payments"] as const,
  calendar: ["calendar"] as const,
  users: ["users"] as const,
} as const;

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

export const DIRECTIONS = ["Inbound", "Outbound"] as const;
export const VEHICLE_TYPES = ["Car", "Public Transport"] as const;
