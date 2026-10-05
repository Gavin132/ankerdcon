/** Base shimmer block. Use className to size and shape it. */
function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-sunken ${className}`}
    />
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
