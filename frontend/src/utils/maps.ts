const enc = encodeURIComponent;

export function buildEmbedUrl(start: string, end?: string): string {
  if (end && end.trim()) {
    return `https://maps.google.com/maps?saddr=${enc(start)}&daddr=${enc(end)}&output=embed`;
  }
  return `https://maps.google.com/maps?q=${enc(start)}&output=embed`;
}

export function buildMapsOpenUrl(mapsLink: string, fallbackQuery: string): string {
  return mapsLink || `https://www.google.com/maps/search/?api=1&query=${enc(fallbackQuery)}`;
}
