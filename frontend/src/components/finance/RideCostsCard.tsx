import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Car, ChevronRight } from "lucide-react";
import { RideCostSheet } from "./RideCostSheet";
import { useRideCosts } from "../../hooks/useRideCosts";
import { useCalendar } from "../../hooks/useCalendar";
import { buildTrip } from "../../utils/trips";
import { toDateKey, todayKey } from "../../utils/date";
import { formatAmount } from "../../utils/format";
import { getNow } from "../../store/time.store";

/** A trip stays on this card for this long after its last day. */
const SHOW_DAYS_AFTER = 90;

const PILL = "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold";

/**
 * Ritkosten on the Financiën page: for each recent trip, what passengers owe you for driving
 * (open it to enter the bill and see who pays what) and what you owe the drivers you rode
 * with. An overview, not a ledger: it is settled outside the app.
 *
 * `tripFilter` is the page's own trip filter (a trip id, "none" or null).
 */
export function RideCostsCard({ tripFilter }: { tripFilter: string | null }) {
  const { data } = useRideCosts();
  const { data: events = [] } = useCalendar();
  const [openTripId, setOpenTripId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const today = todayKey();
    const cutoff = new Date(getNow());
    cutoff.setDate(cutoff.getDate() - SHOW_DAYS_AFTER);
    const cutoffKey = toDateKey(cutoff);

    const relevant = (tripId: string) => {
      if (tripFilter === "none") return false;
      if (tripFilter && tripFilter !== tripId) return false;
      const trip = buildTrip(events, tripId);
      if (!trip) return false;
      // Not before the trip has started, and not forever after.
      return toDateKey(trip.days[0].date) <= today && toDateKey(trip.days[trip.days.length - 1].date) >= cutoffKey;
    };
    const title = (tripId: string) => buildTrip(events, tripId)?.title ?? "Trip";

    // Only trips where someone went with you: with nobody to ask there is nothing to settle.
    const driving = data.as_driver
      .filter((s) => relevant(s.trip_id) && s.group.length > 0)
      .map((s) => {
        const owed = s.passengers.reduce((sum, p) => sum + p.amount, 0);
        const waiting = !s.amount;
        return {
          key: `d-${s.trip_id}`,
          tripId: s.trip_id,
          title: `Jij reed · ${title(s.trip_id)}`,
          sub: waiting
            ? "Vul in wat het rijden kostte"
            : s.passengers.length === 0
              ? "Te weinig om te delen"
              : `${s.passengers.length} ${s.passengers.length === 1 ? "persoon betaalt" : "personen betalen"} jou`,
          amount: !waiting && s.passengers.length > 0 ? owed : null,
          pill: waiting ? "Invullen" : "Bekijken",
          tone: waiting ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-sunken text-ink-2",
          owed: true,
        };
      });
    const riding = data.as_passenger
      .filter((l) => relevant(l.trip_id))
      .map((l) => ({
        key: `p-${l.trip_id}-${l.driver}`,
        tripId: null as string | null,
        title: `Jij betaalt ${l.driver}`,
        sub: title(l.trip_id),
        amount: l.amount,
        pill: "Te betalen",
        tone: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
        owed: false,
      }));
    return [...driving, ...riding];
  }, [data, events, tripFilter]);

  if (rows.length === 0) return null;
  const openTitle = openTripId ? buildTrip(events, openTripId)?.title ?? "Trip" : "";

  return (
    <>
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <Car size={13} className="shrink-0 text-ink-3" />
          <p className="section-label">Ritkosten</p>
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {rows.map((row) => {
            const body = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{row.title}</span>
                  <span className="block truncate text-[12px] text-ink-3">{row.sub}</span>
                </span>
                {row.amount !== null && (
                  <span className="shrink-0 font-mono text-[13.5px] font-semibold tabular-nums text-ink">{formatAmount(row.amount)}</span>
                )}
                <span className={`${PILL} ${row.tone}`}>{row.pill}</span>
                {row.tripId && <ChevronRight size={15} className="shrink-0 text-ink-3" />}
              </>
            );
            return (
              <li key={row.key}>
                {row.tripId ? (
                  <button
                    type="button"
                    onClick={() => setOpenTripId(row.tripId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex w-full items-center gap-3 px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line bg-sunken px-4 py-2.5 text-[12px] leading-snug text-ink-3">
          Een overzicht van wat het rijden kost, niet iets wat hier betaald wordt. Reken het af met een Tikkie.
        </p>
      </motion.section>

      <RideCostSheet tripId={openTripId} tripTitle={openTitle} onClose={() => setOpenTripId(null)} />
    </>
  );
}
