import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BedDouble, Phone, ChevronDown, Search } from "lucide-react";
import { LocationPingDisplay } from "../common/LocationPingDisplay";
import { avatarColor } from "../../utils/avatar";
import { listItem } from "../../utils/motion";
import type { User } from "../../types";

interface CrewSectionProps {
  users: User[];
}

export function CrewSection({ users }: CrewSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

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
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(true)}>
          <div className="flex -space-x-2">
            {users.slice(0, 8).map((u) => (
              <div
                key={u.name}
                title={u.name}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 bg-gradient-to-br text-xs font-black text-white ${avatarColor(u.name)}`}
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
                    <div key={u.name} className="flex items-center gap-3 px-4 py-3.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white ${avatarColor(u.name)}`}
                      >
                        {u.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</p>
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
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
