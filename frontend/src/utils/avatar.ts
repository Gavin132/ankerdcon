// Flat fills for people without their own colour or Discord avatar. Callers
// may still add `bg-gradient-to-br`; without gradient stops that draws nothing,
// so the fill shows.
const AVATAR_COLORS = [
  "bg-sky-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-500",
  "bg-slate-600",
  "bg-fuchsia-600",
];

export function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function personInitial(name: string): string {
  return name[0]?.toUpperCase() ?? "?";
}
