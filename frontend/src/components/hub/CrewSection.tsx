import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BedDouble, Phone, ChevronDown, Search } from "lucide-react";
import { LocationPingDisplay } from "../common/LocationPingDisplay";
import { UserNameDisplay } from "../common/UserNameDisplay";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { avatarColor } from "../../utils/avatar";
import { listItem } from "../../utils/motion";
import { useAuthStore } from "../../store/auth.store";
import { useCalendar } from "../../hooks/useCalendar";
import type { User } from "../../types";

interface CrewSectionProps {
  users: User[];
}

export function CrewSection({ users }: CrewSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>({ top: 0, left: 0, right: 0, height: 0 });
  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: calendarEvents } = useCalendar();

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  return (
    <motion.div variants={listItem}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between mb-3 group"
      >
        <p className="section-label">Leden ({users.length})</p>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 group-hover:text-slate-600 transition-colors dark:group-hover:text-slate-300"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* Avatar strip when collapsed */}
      {!expanded && users.length > 0 && (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          <div className="flex -space-x-2">
            {users.slice(0, 8).map((u) => (
              <div
                key={u.name}
                title={u.name}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 bg-gradient-to-br text-xs font-black text-white ${avatarColor(u.name)}`}
                style={
                  u.color
                    ? { backgroundColor: u.color, backgroundImage: "none" }
                    : undefined
                }
              >
                {u.name[0]}
              </div>
            ))}
            {users.length > 8 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-xs font-black text-slate-600 dark:text-slate-300">
                +{users.length - 8}
              </div>
            )}
          </div>
          <span className="text-xs text-slate-400 font-medium">Tik om te bekijken</span>
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="input-field py-2 pl-8 text-sm"
                  placeholder="Wie zoek je?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="card-surface rounded-2xl divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">
                    Geen resultaten voor &ldquo;{query}&rdquo;
                  </p>
                ) : (
                  filtered.map((u) => (
                    <button
                      key={u.name}
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setPopupAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
                        setPopupUser(u);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 active:bg-slate-50 transition-colors dark:hover:bg-slate-800/60"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${avatarColor(u.name)}`}
                        style={
                          u.color
                            ? { backgroundColor: u.color, backgroundImage: "none" }
                            : undefined
                        }
                      >
                        {u.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <UserNameDisplay
                          name={u.name}
                          clickable={false}
                          className="font-bold text-sm block"
                        />
                        <div className="flex flex-wrap items-center gap-3 mt-0.5">
                          {u.hotel_room && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <BedDouble size={11} />
                              Kamer {u.hotel_room}
                            </span>
                          )}
                          {u.phone_number && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Phone size={11} />
                              {u.phone_number}
                            </span>
                          )}
                        </div>
                      </div>
                      {u.live_location_ping && (
                        <LocationPingDisplay raw={u.live_location_ping} />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile popup */}
      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.name}
        anchorRect={popupAnchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents ?? []}
      />
    </motion.div>
  );
}
