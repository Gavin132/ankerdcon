import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { listItem } from "../../utils/motion";
import type { ActionAlert, RestaurantGap } from "../../types";
import { EventAlertBlock } from "./EventAlertBlock";
import { RestaurantGapBlock } from "./RestaurantGapBlock";

interface DailyActionCheckProps {
  alerts: ActionAlert[];
  restaurantGaps?: RestaurantGap[];
}

export function DailyActionCheck({
  alerts,
  restaurantGaps = [],
}: DailyActionCheckProps) {
  if (alerts.length === 0 && restaurantGaps.length === 0) return null;

  const totalMissing =
    alerts.reduce((s, a) => s + a.missing.length, 0) + restaurantGaps.length;

  return (
    <motion.div variants={listItem}>
      <CollapsibleSection
        defaultOpen
        titleClassName="mb-3"
        title={
          <span className="section-label flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-500" />
            Actie vereist ({totalMissing})
          </span>
        }
      >
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300" />
          <div>
          {alerts.map((alert) => (
            <EventAlertBlock key={alert.date + alert.eventName} alert={alert} />
          ))}
          {restaurantGaps.map((gap) => (
            <RestaurantGapBlock key={gap.id} gap={gap} />
          ))}
          </div>
        </div>
      </CollapsibleSection>
    </motion.div>
  );
}
