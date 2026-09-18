/** Base shimmer block. Use className to size and shape it. */
function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-sunken ${className}`}
    />
  );
}

// ─── Card skeletons ────────────────────────────────────────────────────────────

/** Mirrors the RideCard layout (header + body). */
export function RideCardSkeleton() {
  return (
    <div className="card-surface overflow-hidden">
      {/* Header placeholder */}
      <div className="h-[88px] animate-pulse bg-sunken" />
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
              <Bone key={i} className="h-6 w-6 rounded-full ring-2 ring-surface" />
            ))}
          </div>
          <Bone className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Mirrors the HubPage layout: greeting, trip ticket, quick tiles and "Voor jou". */
export function HubSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-3 w-40" />
        <Bone className="h-9 w-48" />
      </div>
      <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] xl:gap-8 xl:space-y-0">
        <div className="space-y-6">
          <Bone className="h-64 w-full rounded-[14px]" />
          <div className="grid grid-cols-2 gap-3">
            <Bone className="h-24 rounded-xl" />
            <Bone className="h-24 rounded-xl" />
          </div>
        </div>
        <Bone className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
