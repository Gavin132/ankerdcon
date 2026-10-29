import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Car } from "lucide-react";
import { RideCostSheet } from "./RideCostSheet";
import { FinanceRow, type FinancePillTone, type FinanceTone } from "./FinanceRow";
import { useRideCosts } from "../../hooks/useRideCosts";
import { useCalendar } from "../../hooks/useCalendar";
import { buildTrip } from "../../utils/trips";
import { toDateKey, todayKey } from "../../utils/date";
import { getNow } from "../../store/time.store";

/** A trip stays on this card for this long after its last day. */
const SHOW_DAYS_AFTER = 90;

/**
 * Ritkosten on the Financiën page: for each recent trip, what passengers owe you for driving
 * (open it to enter the bill and see who pays what) and what you owe the drivers you rode
 * with. An overview, not a ledger: it is settled outside the app.
 *
 * `tripFilter` is the page's own trip filter (a trip id, "none" or null).
 */
export function RideCostsCard({ tripFilter, className = "" }: { tripFilter: string | null; className?: string }) {
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
          // Only "fill in the bill" is something to do; otherwise the amount says what you get.
          pill: waiting ? { text: "Invullen", tone: "warn" as FinancePillTone } : undefined,
          tone: "owed" as FinanceTone,
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
        pill: undefined,
        tone: "owe" as FinanceTone,
      }));
    return [...driving, ...riding];
  }, [data, events, tripFilter]);

  if (rows.length === 0) return null;
  const openTitle = openTripId ? buildTrip(events, openTripId)?.title ?? "Trip" : "";

  return (
    <>
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`card-surface overflow-hidden ${className}`}>
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <Car size={14} className="shrink-0 text-ink-3" />
          <p className="section-label">Ritkosten</p>
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {rows.map((row) => (
            <FinanceRow
              key={row.key}
              lead={
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                  <Car size={16} />
                </span>
              }
              title={row.title}
              sub={row.sub}
              amount={row.amount}
              tone={row.tone}
              pill={row.pill}
              onClick={row.tripId ? () => setOpenTripId(row.tripId) : undefined}
            />
          ))}
        </ul>
        <p className="border-t border-line bg-sunken px-4 py-2.5 text-[12px] leading-snug text-ink-3">
          Een overzicht van wat het rijden kost, niet iets wat hier betaald wordt. Reken het af met een Tikkie.
        </p>
      </motion.section>

      <RideCostSheet tripId={openTripId} tripTitle={openTitle} onClose={() => setOpenTripId(null)} />
    </>
  );
}
