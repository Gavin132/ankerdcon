interface SeatDotsProps {
  total: number;
  left: number;
}

/** Seat squares: filled ink = taken, outlined = free. */
export function SeatDots({ total, left }: SeatDotsProps) {
  const taken = total - left;
  const dots = Math.min(total, 8);
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: dots }).map((_, i) => (
        <i
          key={i}
          className={`inline-block h-[11px] w-[11px] rounded-[3px] ${
            i < taken ? "bg-ink" : "shadow-[inset_0_0_0_1.5px_rgb(var(--ink-3))]"
          }`}
        />
      ))}
      {total > 8 && <span className="font-mono text-[11px] text-ink-3">+{total - 8}</span>}
    </span>
  );
}
