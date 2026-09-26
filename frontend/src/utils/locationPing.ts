/** A shared location is hidden this long after it was sent. */
export const PING_TTL_MS = 2 * 60 * 60 * 1000;

export interface LocationPing {
  zone: string | null;
  text: string;
  /** When it was sent; null for the old "zone|text (at HH:MM)" format, which has no date. */
  at: Date | null;
  lat?: number;
  lng?: number;
  accuracy?: number;
}

/** Reads a stored ping: JSON (current) or the old "zone|text (at HH:MM)" string. */
export function parsePing(raw: string | null | undefined): LocationPing | null {
  if (!raw) return null;
  if (raw.trimStart().startsWith("{")) {
    try {
      const p = JSON.parse(raw) as Record<string, unknown>;
      const at = typeof p.at === "string" ? new Date(p.at) : null;
      return {
        zone: typeof p.zone === "string" && p.zone ? p.zone : null,
        text: typeof p.text === "string" ? p.text : "",
        at: at && !isNaN(at.getTime()) ? at : null,
        lat: typeof p.lat === "number" ? p.lat : undefined,
        lng: typeof p.lng === "number" ? p.lng : undefined,
        accuracy: typeof p.accuracy === "number" ? p.accuracy : undefined,
      };
    } catch {
      return null;
    }
  }
  const withoutTime = raw.replace(/\s*\(at \d{2}:\d{2}\)$/, "").trim();
  const pipe = withoutTime.indexOf("|");
  return pipe === -1
    ? { zone: null, text: withoutTime, at: null }
    : { zone: withoutTime.slice(0, pipe).trim() || null, text: withoutTime.slice(pipe + 1).trim(), at: null };
}

/** Only a dated ping younger than the TTL counts; old-format pings have no date and are treated as expired. */
export function isPingFresh(raw: string | null | undefined, now: number = Date.now()): boolean {
  const ping = parsePing(raw);
  return !!ping?.at && now - ping.at.getTime() < PING_TTL_MS;
}

/** "zojuist", "12 min geleden", "1 uur geleden". */
export function pingAgo(at: Date, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - at.getTime()) / 60000));
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes} min geleden`;
  return `${Math.floor(minutes / 60)} uur geleden`;
}

export function pingMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
