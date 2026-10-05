import { useState } from "react";
import { pickJoke } from "../../constants/chemistryJokes";

/** A small random chemistry joke, to soften an error screen. Picked once per
 * mount, so it doesn't change while someone is reading it. */
export function ChemistryJoke({ className = "" }: { className?: string }) {
  const [joke] = useState(() => pickJoke());
  return (
    <p className={`max-w-[300px] text-xs leading-relaxed text-ink-3 ${className}`}>
      <span className="section-label mb-1 block">Scheikundemop</span>
      {joke}
    </p>
  );
}
