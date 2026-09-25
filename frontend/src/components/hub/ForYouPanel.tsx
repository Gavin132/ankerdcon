import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bus, CheckCheck, CheckCircle2, ChevronDown, ChevronRight, UtensilsCrossed, Wallet } from "lucide-react";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import { computeAllActions } from "../../utils/actionItems";
import { useSettleUp } from "../../hooks/useSettlements";
import { useCurrentUser } from "../../hooks/useUsers";
import { buildTrip, currentTripId, isTripOver, tripGaps } from "../../utils/trips";
import { formatAmount, formatTime } from "../../utils/format";
import type { CalendarEvent, Expense, Meal, Ride } from "../../types";

interface ForYouPanelProps {
  events: CalendarEvent[];
  rides: Ride[];
  meals: Meal[];
  expenses: Expense[];
  myName: string | undefined;
}

interface ForYouItem {
  key: string;
  tone: "bad" | "warn" | "info";
  icon: React.ReactNode;
  title: string;
  /** Where it gets fixed, e.g. "HDCC · Event › Vervoer". */
  where: string;
  go: () => void;
}

const COLLAPSED_COUNT = 4;

const TONE = {
  bad:  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-brand-soft text-brand-text",
};

function people(n: number) {
  return n === 1 ? "1 persoon heeft" : `${n} mensen hebben`;
}

/**
 * Hub › Voor jou: everything that needs doing, each item opening the place
 * where it's fixed. Replaces the old Acties banner and page — the fixing
 * itself happens in Event › Vervoer / Eten, the meal page or Financiën.
 */
export function ForYouPanel({ events, rides, meals, expenses, myName }: ForYouPanelProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { data: settleUp } = useSettleUp();
  const { data: me } = useCurrentUser();
  const items: ForYouItem[] = [];

  // ── The current trip's sign-up gaps ────────────────────────────────────────
  const tripId = currentTripId(events);
  const trip = tripId ? buildTrip(events, tripId) : null;
  if (trip && !isTripOver(trip)) {
    const gaps = tripGaps(trip, rides, meals);
    const meMissing = gaps.transport.find((g) => g.name === myName);
    if (meMissing) {
      items.push({
        key: "me-transport",
        tone: "bad",
        icon: <Bus size={15} />,
        title: `Je hebt nog geen ${meMissing.items.length === 2 ? "heen- en terugrit" : meMissing.items[0] === "Heen" ? "heenrit" : "terugrit"}`,
        where: `${trip.title} · Event › Vervoer`,
        go: () => navigate(routes.trip.view(trip.id, "transport")),
      });
    }
    const othersMissing = gaps.transport.filter((g) => g.name !== myName);
    if (othersMissing.length > 0) {
      items.push({
        key: "transport",
        tone: "warn",
        icon: <Bus size={15} />,
        title: `${people(othersMissing.length)} nog geen vervoer`,
        where: `${trip.title} · Event › Vervoer`,
        go: () => navigate(routes.trip.view(trip.id, "transport")),
      });
    }
    if (gaps.food.length > 0) {
      const meHungry = !!myName && gaps.food.includes(myName);
      items.push({
        key: "food",
        tone: "warn",
        icon: <UtensilsCrossed size={15} />,
        title: meHungry && gaps.food.length === 1
          ? "Je eet nog nergens mee"
          : `${gaps.food.length === 1 ? "1 persoon eet" : `${gaps.food.length} mensen eten`} nog niet mee`,
        where: `${trip.title} · Event › Eten`,
        go: () => navigate(routes.trip.view(trip.id)),
      });
    }
  }

  // ── Restaurant rides and payments ─────────────────────────────────────────
  for (const action of computeAllActions({ rides, meals, expenses, myName })) {
    if (action.kind === "restaurant_gap") {
      const { gap } = action;
      items.push({
        key: `restaurant-${gap.id}`,
        tone: "warn",
        icon: <UtensilsCrossed size={15} />,
        title: `${people(gap.unassigned.length)} geen auto naar het restaurant`,
        where: `Vertrek ${formatTime(gap.departureTime)} · ${gap.location}`,
        go: () =>
          gap.linkedMealId
            ? navigate(routes.meal.view(gap.linkedMealId))
            : navigate(routes.currentTrip.tab("transport"), { state: { tab: "Restaurant" } }),
      });
    } else if (action.kind === "payment_due") {
      items.push({
        key: `pay-${action.share.id}`,
        tone: "warn",
        icon: <Wallet size={15} />,
        title: `Betaal ${formatAmount(action.share.amount)} aan ${action.expense.paid_by}`,
        where: `${action.expense.description} · Financiën`,
        go: () => navigate(routes.expense.view(action.expense.id)),
      });
    } else {
      const n = action.shares.length;
      items.push({
        key: `confirm-${action.expense.id}`,
        tone: "info",
        icon: <CheckCheck size={15} />,
        title: `Bevestig ${n} ${n === 1 ? "betaling" : "betalingen"}`,
        where: `${action.expense.description} · Financiën`,
        go: () => navigate(routes.expense.view(action.expense.id)),
      });
    }
  }

  // ── Settle-up payments waiting on me ──────────────────────────────────────
  for (const s of settleUp?.settlements ?? []) {
    if (s.status === "requested" && s.from_user_id === me?.id) {
      items.push({
        key: `settle-pay-${s.id}`,
        tone: "warn",
        icon: <Wallet size={15} />,
        title: `${s.to_user} vraagt ${formatAmount(s.amount, s.currency)}`,
        where: "Financiën › Afrekenen",
        go: () => navigate(routes.settlement.view(s.id)),
      });
    } else if (s.status === "claimed" && s.to_user_id === me?.id) {
      items.push({
        key: `settle-confirm-${s.id}`,
        tone: "info",
        icon: <CheckCheck size={15} />,
        title: `Bevestig ${formatAmount(s.amount, s.currency)} van ${s.from_user}`,
        where: "Financiën › Afrekenen",
        go: () => navigate(routes.settlement.view(s.id)),
      });
    }
  }

  const shown = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const hidden = items.length - shown.length;

  return (
    <motion.section variants={listItem} className="card-surface overflow-hidden" aria-labelledby="for-you-title">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <p id="for-you-title" className="section-label">Voor jou</p>
        {items.length > 0 && (
          <span className="rounded-full bg-rose-600 px-2 font-mono text-[11px] font-semibold leading-[18px] text-white tabular-nums dark:bg-rose-500">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 pb-4 text-sm text-ink-2">
          <CheckCircle2 size={16} className="text-emerald-500" />
          Alles is geregeld
        </p>
      ) : (
        <ul className="px-2 pb-2">
          {shown.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={item.go}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-sunken active:bg-sunken transition-colors"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE[item.tone]}`}>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug text-ink">{item.title}</span>
                  <span className="block truncate text-[11px] text-ink-3">{item.where}</span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-ink-3" />
              </button>
            </li>
          ))}
          {items.length > COLLAPSED_COUNT && (
            <li>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold text-ink-3 hover:text-ink"
              >
                <ChevronDown size={13} className={expanded ? "rotate-180" : ""} />
                {expanded ? "Minder tonen" : `Nog ${hidden} tonen`}
              </button>
            </li>
          )}
        </ul>
      )}
    </motion.section>
  );
}
