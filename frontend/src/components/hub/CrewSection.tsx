import { useState } from "react";
import { motion } from "framer-motion";
import { BedDouble, ChevronDown, ChevronUp, Search } from "lucide-react";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { LocationPingDisplay } from "../common/LocationPingDisplay";
import { avatarColor } from "../../utils/avatar";
import { listItem } from "../../utils/motion";
import type { User } from "../../types";

const CREW_INITIAL = 5;

interface CrewSectionProps {
  users: User[];
}

export function CrewSection({ users }: CrewSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  const isSearching = query.length > 0;
  const visible = isSearching || showAll ? filtered : filtered.slice(0, CREW_INITIAL);
  const remaining = users.length - CREW_INITIAL;

  return (
    <motion.div variants={listItem}>
      <CollapsibleSection
        defaultOpen
        titleClassName="mb-3"
        title={<span className="section-label">Crew ({users.length})</span>}
      >
        <div className="relative mb-2">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input-field py-2 pl-8 text-sm"
            placeholder="Zoek crew..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="card-surface rounded-2xl divide-y divide-slate-50 overflow-hidden">
          {visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              Geen resultaten voor &ldquo;{query}&rdquo;
            </p>
          ) : (
            visible.map((u) => (
              <div key={u.name} className="flex items-center gap-3 px-4 py-3.5">
                <div
                  className={`avatar h-10 w-10 rounded-xl bg-gradient-to-br text-sm ${avatarColor(u.name)} shadow-sm`}
                >
                  {u.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 capitalize">{u.name}</p>
                  {u.hotel_room && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <BedDouble size={11} />
                      Kamer {u.hotel_room}
                    </span>
                  )}
                </div>
                {u.live_location_ping && (
                  <LocationPingDisplay raw={u.live_location_ping} />
                )}
              </div>
            ))
          )}

          {!isSearching && users.length > CREW_INITIAL && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 py-3 text-sm font-semibold text-sky-600 hover:bg-sky-50 transition-colors"
            >
              {showAll ? (
                <>Minder tonen <ChevronUp size={14} /></>
              ) : (
                <>Toon {remaining} meer <ChevronDown size={14} /></>
              )}
            </button>
          )}
        </div>
      </CollapsibleSection>
    </motion.div>
  );
}
