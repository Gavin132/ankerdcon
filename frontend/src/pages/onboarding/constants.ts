import {
  LayoutDashboard,
  Car,
  UtensilsCrossed,
  Wallet,
  CalendarDays,
} from "lucide-react";

export const TOTAL_STEPS = 3; // features(1) + profile(2) + done(3); dialogue is step 0

export const NAME_COLORS = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f43f5e",
  "#f59e0b", "#6366f1", "#ec4899", "#14b8a6",
  "#fb923c", "#a3e635",
];

export const BANNER_COLORS = [
  "#0f172a", "#1e293b", "#1a1a2e", "#2d1b69",
  "#0c4a6e", "#14532d", "#7c2d12", "#0369a1",
  "#064e3b", "#4c0519",
];

export const FEATURES = [
  {
    icon: LayoutDashboard,
    color: "bg-sky-500/10 text-sky-500",
    title: "Hub",
    desc: "Overzicht van alle activiteiten, het aankomende evenement en wie er aanwezig is.",
  },
  {
    icon: Car,
    color: "bg-violet-500/10 text-violet-500",
    title: "Transport",
    desc: "Plan je rit naar het evenement, meld je aan als passagier of bied een lift aan.",
  },
  {
    icon: UtensilsCrossed,
    color: "bg-amber-500/10 text-amber-500",
    title: "Eten",
    desc: "Bekijk geplande maaltijden en meld je eenvoudig aan.",
  },
  {
    icon: Wallet,
    color: "bg-emerald-500/10 text-emerald-500",
    title: "Financien",
    desc: "Houd gedeelde kosten bij en verdeel uitgaven eerlijk met de groep.",
  },
  {
    icon: CalendarDays,
    color: "bg-rose-500/10 text-rose-500",
    title: "Agenda & Meer",
    desc: "Bekijk alle aankomende evenementen, geef je op en beheer je profiel.",
  },
];

export const ACTIVITY_STOPS = [
  { label: "Nieuw",      tag: "Net begonnen!",      emoji: "🌱" },
  { label: "Paar mnd.", tag: "Aan het ontdekken",  emoji: "😊" },
  { label: "~1 jaar",   tag: "Vertrouwd gezicht",  emoji: "👍" },
  { label: "2–3 jaar",  tag: "Vaste kern",          emoji: "⭐" },
  { label: "Lang!",     tag: "OG-lid",              emoji: "🏆" },
] as const;

export const YEAR_MIN = 2000;
export const YEAR_MAX = new Date().getFullYear();
export const YEAR_DEFAULT = 2005;

export const STARS = Array.from({ length: 36 }, (_, i) => ({
  left:    `${((i * 47 + 13) % 97) + 1}%`,
  top:     `${((i * 31 + 7)  % 90) + 1}%`,
  opacity: (((i * 17 + 5)    % 4)  * 0.07 + 0.06),
  size:    i % 7 === 0 ? 2 : 1,
}));
