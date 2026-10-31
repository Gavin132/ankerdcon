// Pictures for the made-up data, drawn as SVG so nothing is fetched and nothing real is shown.
function svg(width: number, height: number, hue: number, label: string): string {
  const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 58%)"/><stop offset="1" stop-color="hsl(${(hue + 55) % 360} 65% 32%)"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${width * 0.72}" cy="${height * 0.3}" r="${Math.min(width, height) * 0.14}" fill="rgba(255,255,255,0.35)"/>
<path d="M0 ${height} L${width * 0.35} ${height * 0.55} L${width * 0.6} ${height * 0.8} L${width * 0.8} ${height * 0.6} L${width} ${height} Z" fill="rgba(0,0,0,0.25)"/>
<text x="${width / 2}" y="${height / 2}" font-family="sans-serif" font-size="${Math.min(width, height) / 9}" font-weight="700" fill="white" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(art)}`;
}

export const coverImage = (hue: number, label = "Cover") => svg(1200, 600, hue, label);
export const photoImage = (n: number) => svg(960, 1280, (n * 47) % 360, `Foto ${n}`);
export const thumbImage = (n: number) => svg(240, 320, (n * 47) % 360, `${n}`);
export const wideImage = (n: number) => svg(1200, 800, (n * 83) % 360, `Inspiratie ${n}`);
export const avatarImage = (hue: number, letter: string) => svg(128, 128, hue, letter);
export const badgeImage = (hue: number) => svg(128, 128, hue, "★");
