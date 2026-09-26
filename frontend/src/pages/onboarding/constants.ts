import {
  LayoutDashboard,
  Ticket,
  CalendarDays,
  Wallet,
  Users,
} from "lucide-react";

export const TOTAL_STEPS = 4; // features(1) + profile(2) + notifications(3) + done(4); dialogue is step 0

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
    color: "bg-sunken text-ink",
    title: "Hub",
    desc: "Je volgende trip en alles wat jij nog moet regelen, op één plek.",
  },
  {
    icon: Ticket,
    color: "bg-sunken text-ink",
    title: "Event",
    desc: "Alles voor één trip: vervoer, eten, hotelkamers, cosplays en foto's.",
  },
  {
    icon: CalendarDays,
    color: "bg-sunken text-ink",
    title: "Agenda",
    desc: "Bekijk alle evenementen en geef je op voor de dagen dat je meegaat.",
  },
  {
    icon: Wallet,
    color: "bg-sunken text-ink",
    title: "Financiën",
    desc: "Houd gedeelde kosten bij en verdeel uitgaven eerlijk met de groep.",
  },
  {
    icon: Users,
    color: "bg-sunken text-ink",
    title: "Crew",
    desc: "Iedereen in de groep, hun profielen en waar ze nu zijn.",
  },
];

export const ACTIVITY_STOPS = [
  { label: "Nieuw",      tag: "Net begonnen!",      emoji: "🌱" },
  { label: "Paar mnd.", tag: "Aan het ontdekken",  emoji: "😊" },
  { label: "~1 jaar",   tag: "Vertrouwd gezicht",  emoji: "👍" },
  { label: "2–3 jaar",  tag: "Vaste kern",          emoji: "⭐" },
  { label: "Lang!",     tag: "OG-lid",              emoji: "🏆" },
] as const;

export const YEAR_MIN = 1990;
export const YEAR_MAX = new Date().getFullYear();
export const YEAR_DEFAULT = 2005;

export const STARS = Array.from({ length: 36 }, (_, i) => ({
  left:    `${((i * 47 + 13) % 97) + 1}%`,
  top:     `${((i * 31 + 7)  % 90) + 1}%`,
  opacity: (((i * 17 + 5)    % 4)  * 0.07 + 0.06),
  size:    i % 7 === 0 ? 2 : 1,
}));
