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

/** The row at the end of the sign-up line: the quiet action first, the one primary last. */
export function HeroActions({ children }: { children: ReactNode }) {
  return <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

/** "Afmelden", "Uitstappen": outlined on the dark block, as tall as the primary next to it. */
export function HeroSecondaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`hit-area flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border-1.5 border-hero-ink/25 px-3.5 py-2 text-xs font-semibold text-hero-ink transition-colors hover:border-hero-ink/50 ${className}`}
      {...props}
    />
  );
}

/** "Aanmelden", "Stap in": the one blue button of the hero. */
export function HeroPrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`btn-primary min-h-[40px] px-3.5 py-2 text-xs ${className}`} {...props} />;
}
