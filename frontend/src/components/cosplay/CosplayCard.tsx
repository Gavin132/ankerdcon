import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { formatDate } from "../../utils/format";
import { listItem } from "../../utils/motion";
import type { Cosplay, CalendarEvent, User } from "../../types";

interface CosplayCardProps {
  cosplay: Cosplay;
  events: CalendarEvent[];
  users: User[];
  onClick: () => void;
}

/** A cosplay as a flat tile: inspiration image (or an empty well), character, series, who and which days. */
// forwardRef: TripCosplayTab's <AnimatePresence mode="popLayout"> measures each
// card through a ref to animate it out when a cosplay is removed.
export const CosplayCard = forwardRef<HTMLDivElement, CosplayCardProps>(function CosplayCard(
  { cosplay, events, users, onClick },
  ref,
) {
  const user = users.find(
    (u) => u.name === cosplay.user_name || u.discord_username === cosplay.user_name,
  );

  const linkedEvents = cosplay.linked_event_ids
    .map((eid) => events.find((e) => e.id === eid))
    .filter((e): e is CalendarEvent => e !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  const thumbnail = cosplay.inspo_images[0];

  return (
    <motion.div ref={ref} variants={listItem} className="h-full">
      <button
        type="button"
        onClick={onClick}
        className="card-surface-hover flex h-full w-full flex-col overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
      >
        {/* Image or empty well */}
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden border-b-1.5 border-line bg-sunken">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={cosplay.character_name}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                (e.currentTarget.nextSibling as HTMLElement | null)?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center text-ink-3 ${thumbnail ? "hidden" : ""}`}>
            <Sparkles size={20} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight text-ink">
              {cosplay.character_name}
            </p>
            {cosplay.series && (
              <p className="mt-0.5 truncate text-xs text-ink-3">
                {cosplay.series}
              </p>
            )}
          </div>

          {/* Who */}
          <div className="flex min-w-0 items-center gap-1.5">
            <UserAvatar
              name={user?.name ?? cosplay.user_name}
              user={user}
              className="h-5 w-5 shrink-0 text-[8px]"
            />
            <span className="truncate text-[12px] font-medium text-ink-2">
              {user?.name ?? cosplay.user_name}
            </span>
          </div>

          {/* Days + photo count */}
          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            {linkedEvents.map((e) => (
              <span
                key={e.id}
                className="rounded-md border border-line px-1.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2"
              >
                {formatDate(e.date)}
              </span>
            ))}
            <span className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-3">
              {cosplay.inspo_images.length > 0
                ? `${cosplay.inspo_images.length} foto${cosplay.inspo_images.length !== 1 ? "'s" : ""}`
                : "Geen foto's"}
            </span>
          </div>
        </div>
      </button>
    </motion.div>
  );
});
