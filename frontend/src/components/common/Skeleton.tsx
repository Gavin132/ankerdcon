/** Base shimmer block. Use className to size and shape it. */
function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700/60 ${className}`}
    />
  );
}

// ─── Card skeletons ────────────────────────────────────────────────────────────

/** Mirrors the new RideCard layout (gradient header + body). */
export function RideCardSkeleton() {
  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      {/* Gradient header placeholder */}
      <div className="h-[88px] animate-pulse bg-slate-200 dark:bg-slate-700/60" />
      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Driver row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bone className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5">
              <Bone className="h-2 w-16" />
              <Bone className="h-3.5 w-28" />
            </div>
          </div>
          <Bone className="h-7 w-20 rounded-xl" />
        </div>
        {/* Seat progress bar */}
        <Bone className="h-1.5 w-full rounded-full" />
        {/* Passengers + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-800" />
            ))}
          </div>
          <Bone className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Mirrors the MealCard layout. */
export function MealCardSkeleton() {
  return (
    <div className="card-surface rounded-2xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <Bone className="h-11 w-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Bone className="h-4 w-36" />
          <Bone className="h-3 w-28" />
        </div>
        <Bone className="h-10 w-10 rounded-xl shrink-0" />
      </div>
      {/* Pill row */}
      <div className="flex gap-2">
        <Bone className="h-7 w-28 rounded-lg" />
        <Bone className="h-7 w-20 rounded-lg" />
      </div>
      {/* Person count */}
      <Bone className="h-3 w-32" />
    </div>
  );
}

/** Mirrors the PaymentCard layout. */
export function PaymentCardSkeleton() {
  return (
    <div className="card-surface rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Bone className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-3 w-40" />
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Bone className="h-5 w-16" />
          <Bone className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

/** Mirrors the HubPage hero + stat grid layout. */
export function HubSkeleton() {
  return (
    <div className="space-y-6">
      <Bone className="h-44 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Bone className="h-32 w-full rounded-2xl" />
    </div>
  );
}
