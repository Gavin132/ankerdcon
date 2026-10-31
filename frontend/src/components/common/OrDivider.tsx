/** A hairline with a short centred label ("of ga verder met") between two groups of actions. */
export function OrDivider({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div role="separator" aria-label={label} className={`flex items-center gap-3 ${className}`}>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span aria-hidden="true" className="text-xs font-semibold text-ink-3">
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
