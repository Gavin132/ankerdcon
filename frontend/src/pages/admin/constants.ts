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
  ListChecks,
  AlertTriangle,
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
      { label: "Whitelist",   path: routes.admin.whitelist, icon: ListChecks },
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
      { label: "Schermen testen", path: routes.admin.screens, icon: AlertTriangle },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  [routes.admin.base]:        "Dashboard",
  [routes.admin.users]:       "Gebruikers",
  [routes.admin.whitelist]:   "Whitelist",
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
  [routes.admin.screens]: "Schermen testen",
};

// Ride direction tags are told apart by their label, not by colour (flat design:
// no decorative colours).
export const DIRECTION_COLORS: Record<string, string> = {
  Inbound:    "text-ink-2",
  Outbound:   "text-ink-2",
  Restaurant: "text-ink-2",
};
