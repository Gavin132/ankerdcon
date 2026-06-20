const enc = encodeURIComponent;

export function parseRoute(
  mapsLink: string,
): { origin: string; destination: string } | null {
  if (!mapsLink) return null;
  try {
    const url = new URL(mapsLink);
    const origin = url.searchParams.get("origin");
    const destination = url.searchParams.get("destination");
    if (origin && destination) return { origin, destination };
  } catch {
    // ignore malformed URLs
  }
  return null;
}

export function buildEmbedUrl(start: string, end?: string): string {
  if (end && end.trim()) {
    return `https://maps.google.com/maps?saddr=${enc(start)}&daddr=${enc(end)}&output=embed`;
  }
  return `https://maps.google.com/maps?q=${enc(start)}&output=embed`;
}

export function buildMapsOpenUrl(mapsLink: string, fallbackQuery: string): string {
  return mapsLink || `https://www.google.com/maps/search/?api=1&query=${enc(fallbackQuery)}`;
}

export function buildMapsLink(start: string, end?: string): string {
  if (end) {
    return `https://www.google.com/maps/dir/?api=1&origin=${enc(start)}&destination=${enc(end)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${enc(start)}`;
}
