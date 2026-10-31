/** Colour maths for the few places that have to compute a colour in code (the others use the tokens in index.css). */

export type Rgb = [number, number, number];

/** `#rgb` or `#rrggbb` to its channels; anything else (a name, a gradient, an empty string) gives null. */
export function parseHex(value: string | null | undefined): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((value ?? "").trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function toHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("");
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1 (none) to 21 (black on white). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * `color` itself when it already reads on `backdrop` (at least `min`:1), else the same hue and saturation
 * moved lighter or darker (towards whichever end of the scale the backdrop is far from) until it does.
 */
export function readableOn(color: Rgb, backdrop: Rgb, min = 4.5): Rgb {
  if (contrastRatio(color, backdrop) >= min) return color;
  const [h, s, l] = rgbToHsl(color);
  const lighter = luminance(backdrop) < 0.5;
  for (let step = 1; step <= 100; step++) {
    const next = Math.min(1, Math.max(0, l + (lighter ? step : -step) / 100));
    const rgb = hslToRgb([h, s, next]).map(Math.round) as Rgb;
    if (contrastRatio(rgb, backdrop) >= min) return rgb;
  }
  return lighter ? [255, 255, 255] : [0, 0, 0];
}
