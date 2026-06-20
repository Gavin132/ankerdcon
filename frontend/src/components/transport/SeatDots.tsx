interface SeatDotsProps {
  total: number;
  left: number;
}

export function SeatDots({ total, left }: SeatDotsProps) {
  const taken = total - left;
  const dots = Math.min(total, 8);
  return (
    <div className="flex gap-1">
      {Array.from({ length: dots }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i < taken ? "bg-rose-400" : "bg-emerald-400"
          }`}
        />
      ))}
      {total > 8 && <span className="text-xs text-slate-400">+{total - 8}</span>}
    </div>
  );
}
