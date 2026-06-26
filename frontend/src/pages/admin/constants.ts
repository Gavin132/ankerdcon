import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Car,
  UtensilsCrossed,
  CalendarDays,
} from "lucide-react";
import { routes } from "../../config/routes";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "beheer",
    label: "Beheer",
    items: [
      {
        label: "Dashboard",
        path: routes.admin.base,
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    key: "entiteiten",
    label: "Entiteiten",
    items: [
      { label: "Gebruikers", path: routes.admin.users, icon: Users },
      { label: "Ritten", path: routes.admin.rides, icon: Car },
      { label: "Maaltijden", path: routes.admin.meals, icon: UtensilsCrossed },
      { label: "Evenementen", path: routes.admin.events, icon: CalendarDays },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  [routes.admin.base]: "Dashboard",
  [routes.admin.users]: "Gebruikers",
  [routes.admin.rides]: "Ritten",
  [routes.admin.meals]: "Maaltijden",
  [routes.admin.events]: "Evenementen",
};

export const DIRECTION_COLORS: Record<string, string> = {
  Inbound: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Outbound:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  Restaurant:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};
