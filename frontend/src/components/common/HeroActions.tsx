import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/** The chips and buttons on an always-dark hero block (meal and ride headers), so both heroes look the same. */

export type HeroTone = "neutral" | "warn" | "bad";

const TONES: Record<HeroTone, string> = {
  neutral: "border-hero-ink/25 bg-hero-ink/10 text-hero-ink",
  warn: "border-hero-warn/40 bg-hero-warn/15 text-hero-warn",
  bad: "border-hero-bad/40 bg-hero-bad/15 text-hero-bad",
};

/** Class string of a chip, for when the chip is a `Link` or a `button` instead of a `span`. */
export function heroChipClass(tone: HeroTone = "neutral") {
  return `inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] font-mono text-xs font-semibold uppercase tracking-[0.05em] ${TONES[tone]}`;
}

interface HeroChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: HeroTone;
}

/** A small status or fact chip on the hero (the time, "Vol", "Vertrekt over 5 min"). */
export function HeroChip({ tone = "neutral", className = "", ...props }: HeroChipProps) {
  return <span className={`${heroChipClass(tone)} ${className}`} {...props} />;
}

/** The row at the end of the sign-up line: the actions side by side. */
export function HeroActions({ children }: { children: ReactNode }) {
  return <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

/** "Aanmelden", "Afmelden", "Iemand aanmelden", "Stap in", "Uitstappen": every action on the hero is the compact blue button (`btn-compact`: 40 px, 36 px from `lg` up). */
export function HeroButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`btn-primary btn-on-hero btn-compact px-3.5 focus-visible:ring-hero-ink focus-visible:ring-offset-hero ${className}`} {...props} />;
}
