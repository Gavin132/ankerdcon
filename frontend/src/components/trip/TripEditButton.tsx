import { lazy, Suspense, useState } from "react";
import { Pencil } from "lucide-react";
import { useCurrentUser } from "../../hooks/useUsers";
import type { Trip } from "../../utils/trips";

const TripEventEditor = lazy(() => import("./TripEventEditor"));

/** A pencil that opens the event's edit form. Admins only, like the admin panel. */
export function TripEditButton({ trip }: { trip: Trip }) {
  const { data: me } = useCurrentUser();
  const [open, setOpen] = useState(false);
  if (!me?.is_admin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Evenement bewerken"
        aria-label="Evenement bewerken"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
      >
        <Pencil size={16} />
      </button>
      {open && (
        <Suspense fallback={null}>
          <TripEventEditor eventIds={trip.eventIds} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
