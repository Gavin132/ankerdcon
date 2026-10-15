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

/** The width in CSS pixels a Tailwind `h-N` / `h-[Npx]` class asks for (4 px per step), for sizing the file to it. */
export function avatarPx(className: string, fallback = 40): number {
  const step = /(?:^|\s)h-(\d+(?:\.\d+)?)(?=\s|$)/.exec(className);
  if (step) return Number(step[1]) * 4;
  const px = /(?:^|\s)h-\[(\d+)px\]/.exec(className);
  return px ? Number(px[1]) : fallback;
}

/**
 * A profile picture asks for the size it is shown at instead of the one the provider has: a Discord avatar
 * is up to 1024 px and a screen can show dozens of them at 24 to 40 px. Discord and Google both resize on
 * request; any other URL (a custom avatar of ours, already small) is left as it is.
 * `cssPx` is the size on screen; three device pixels per CSS pixel keeps it sharp on a phone.
 */
export function avatarSrc(url: string, cssPx: number): string {
  const want = Math.min(256, Math.max(64, 2 ** Math.ceil(Math.log2(cssPx * 3))));
  try {
    const u = new URL(url);
    if (u.hostname === "cdn.discordapp.com" && u.pathname.startsWith("/avatars/")) {
      u.searchParams.set("size", String(want));
      return u.toString();
    }
    if (u.hostname.endsWith("googleusercontent.com")) {
      // Google's own resize suffix on the last path segment: =s96-c
      return url.replace(/=s\d+(-c)?$/, `=s${want}$1`);
    }
  } catch {
    // Not a URL we can read (a relative path): use it as it is.
  }
  return url;
}

export function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function personInitial(name: string): string {
  return name[0]?.toUpperCase() ?? "?";
}
