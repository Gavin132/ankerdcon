import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BedDouble, Phone, ChevronDown, Search } from "lucide-react";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { LocationPingDisplay } from "../common/LocationPingDisplay";
import type { User } from "../../types";

// 1. Import your new component (adjust the path if it's saved somewhere else!)
import { UserAvatar } from "../common/UserAvatar"; 

interface CrewListProps {
  users: User[];
  isLoading: boolean;
}

export function CrewList({ users, isLoading }: CrewListProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between mb-3 group"
      >
        <p className="section-label">Crew members ({users.length})</p>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400 group-hover:text-slate-600 transition-colors"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* --- UNEXPANDED VIEW (THE FACEPILE) --- */}
      {!expanded && users.length > 0 && (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          <div className="flex -space-x-2">
            {users.slice(0, 8).map((u) => (
              // 2. Replaced the old div with UserAvatar
              <UserAvatar 
                key={u.name} 
                name={u.name} 
                className="h-9 w-9 text-xs" 
              />
            ))}
            {users.length > 8 && (
              <div className="flex z-10 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-black text-slate-600">
                +{users.length - 8}
              </div>
            )}
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Tik om te bekijken
          </span>
        </div>
      )}

      {/* --- EXPANDED VIEW (THE ROSTER) --- */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
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

                <div className="card-surface rounded-2xl divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">
                      Geen resultaten voor &ldquo;{query}&rdquo;
                    </p>
                  ) : (
                    filtered.map((u) => (
                      <div
                        key={u.name}
                        className="flex items-center gap-3 px-4 py-3.5"
                      >
                        {/* 3. Replaced the old div with UserAvatar */}
                        <UserAvatar 
                          name={u.name} 
                          className="h-10 w-10 text-sm" 
                        />
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">
                            {u.name}
                          </p>
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}