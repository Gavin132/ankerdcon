import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
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

export function CosplayCard({ cosplay, events, users, onClick }: CosplayCardProps) {
  const user = users.find(
    (u) => u.name === cosplay.user_name || u.discord_username === cosplay.user_name,
  );

  const linkedEvents = cosplay.linked_event_ids
    .map((eid) => events.find((e) => e.id === eid))
    .filter((e): e is CalendarEvent => e !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  const thumbnail = cosplay.inspo_images[0];

  return (
    <motion.div variants={listItem}>
      <button type="button" onClick={onClick} className="block w-full text-left group">
        <div className="card-surface rounded-2xl overflow-hidden hover:shadow-md active:scale-[0.99] transition-all duration-150">
          {/* Violet accent line */}
          <div className="h-[3px] bg-gradient-to-r from-violet-400 to-purple-500" />

          <div className="flex items-stretch gap-0">
            {/* Main content */}
            <div className="flex-1 min-w-0 px-4 pt-3.5 pb-3">
              {/* User row */}
              <div className="flex items-center gap-2 mb-2.5">
                <UserAvatar
                  name={user?.name ?? cosplay.user_name}
                  user={user}
                  className="h-5 w-5 text-[8px] shrink-0"
                />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {user?.name ?? cosplay.user_name}
                </span>
              </div>

              {/* Character name */}
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                {cosplay.character_name}
              </p>

              {/* Series */}
              {cosplay.series && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {cosplay.series}
                </p>
              )}

              {/* Day chips */}
              {linkedEvents.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {linkedEvents.map((e) => (
                    <span
                      key={e.id}
                      className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300"
                    >
                      {formatDate(e.date)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail or icon */}
            <div className="w-20 shrink-0 relative overflow-hidden bg-slate-100 dark:bg-slate-800/60 border-l border-slate-200 dark:border-slate-700">
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
              <div className={`absolute inset-0 flex items-center justify-center ${thumbnail ? "hidden" : ""}`}>
                <Sparkles size={22} className="text-violet-300 dark:text-violet-600" />
              </div>
              {thumbnail && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <ArrowRight size={16} className="text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-black/10">
            <span className="text-[10px] font-semibold text-slate-400">
              {cosplay.inspo_images.length > 0
                ? `${cosplay.inspo_images.length} foto${cosplay.inspo_images.length !== 1 ? "'s" : ""}`
                : "Geen foto's"}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-500 dark:text-violet-400">
              Bekijk <ArrowRight size={11} />
            </span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
