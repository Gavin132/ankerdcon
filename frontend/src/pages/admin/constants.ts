import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Car,
  UtensilsCrossed,
  CalendarDays,
  ShieldCheck,
  Layers,
  Euro,
  FlaskConical,
  Megaphone,
  UserCog,
  Sparkles,
  Clock,
} from "lucide-react";
import { routes } from "../../config/routes";

export interface SubNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
  children?: SubNavItem[];
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
      { label: "Gebruikers",  path: routes.admin.users,  icon: Users },
      { label: "Ritten",      path: routes.admin.rides,  icon: Car },
      { label: "Maaltijden",  path: routes.admin.meals,  icon: UtensilsCrossed },
      {
        label: "Evenementen",
        path: routes.admin.events,
        icon: CalendarDays,
        children: [
          { label: "Overzicht", path: routes.admin.events,      icon: CalendarDays, end: true },
          { label: "Groepen",   path: routes.admin.eventGroups, icon: Layers },
        ],
      },
      { label: "Badges",      path: routes.admin.badges,     icon: ShieldCheck },
      { label: "Betalingen",  path: routes.admin.betalingen, icon: Euro },
      { label: "Aankondigingen", path: routes.admin.announcements, icon: Megaphone },
      { label: "Wijzigingslog", path: routes.admin.changelog, icon: Sparkles },
    ],
  },
  {
    key: "testen",
    label: "Testen",
    items: [
      { label: "Preview: Onboarding", path: routes.admin.previewOnboarding, icon: FlaskConical },
      { label: "Inloggen als gebruiker", path: routes.admin.impersonate, icon: UserCog },
      { label: "Tijdreis-widget", path: routes.admin.timeTravel, icon: Clock },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  [routes.admin.base]:        "Dashboard",
  [routes.admin.users]:       "Gebruikers",
  [routes.admin.rides]:       "Ritten",
  [routes.admin.meals]:       "Maaltijden",
  [routes.admin.events]:      "Evenementen",
  [routes.admin.eventGroups]: "Evenementgroepen",
  [routes.admin.badges]:      "Badges",
  [routes.admin.betalingen]:  "Betalingen",
  [routes.admin.announcements]: "Aankondigingen",
  [routes.admin.impersonate]: "Inloggen als gebruiker",
  [routes.admin.changelog]: "Wijzigingslog",
  [routes.admin.timeTravel]: "Tijdreis-widget",
};

export const DIRECTION_COLORS: Record<string, string> = {
  Inbound:    "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Outbound:   "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  Restaurant: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};
