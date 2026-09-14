import { useState } from "react";
import { Search, Users, X, BedDouble, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useUsers } from "../hooks/useUsers";
import { useCalendar } from "../hooks/useCalendar";
import { useAuthStore } from "../store/auth.store";
import { useBadges } from "../hooks/useBadges";
import { UserAvatar } from "../components/common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../components/common/UserProfilePopup";
import { BadgeIcon } from "../components/common/BadgeIcon";
import { LocationPingDisplay } from "../components/common/LocationPingDisplay";
import { LocationPingModal } from "../components/hub/LocationPingModal";
import type { User } from "../types";

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

/** Crew tab: everyone in the group, where people are right now, and a way to share your own location. */
export function CrewPage() {
  const [query, setQuery] = useState("");
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [anchorRect, setAnchorRect] = useState<AnchorRect>(CLOSED_RECT);
  const [pingOpen, setPingOpen] = useState(false);

  const { data: users = [], isLoading } = useUsers();
  const { data: calendarEvents } = useCalendar();
  const { data: allBadges = [] } = useBadges();
  const currentUser = useAuthStore((s) => s.currentUser);

  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const pinged = sorted.filter((u) => u.live_location_ping);
  const filtered = query.trim()
    ? sorted.filter((u) => {
        const q = query.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          (u.discord_username ?? "").toLowerCase().includes(q) ||
          u.aliases?.some((a) => a.toLowerCase().includes(q))
        );
      })
    : sorted;

  function openPopup(u: User, e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
    setPopupUser(u);
  }

  function getUserBadges(u: User) {
    return (u.badge_ids ?? [])
      .map((id) => allBadges.find((b) => b.id === id))
      .filter(Boolean)
      .sort((a, b) => a!.display_order - b!.display_order) as typeof allBadges;
  }

  return (
    <div className="space-y-5">

      {/* ── Waar is iedereen ─────────────────────────────────────────── */}
      <section className="card-surface rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <p className="section-label flex items-center gap-1.5">
            <MapPin size={11} className="text-emerald-500" />
            Waar is iedereen
          </p>
          <button
            type="button"
            onClick={() => setPingOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
          >
            <MapPin size={13} />
            Locatie pingen
          </button>
        </div>
        {pinged.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-slate-400 dark:text-slate-500">
            Nog niemand heeft een locatie gedeeld.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pinged.map((u) => (
              <li key={u.name}>
                <button
                  type="button"
                  onClick={(e) => openPopup(u, e)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <UserAvatar name={u.name} user={u} className="h-8 w-8 text-xs shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{u.name}</span>
                  <LocationPingDisplay raw={u.live_location_ping} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Leden ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="section-label">Leden</p>
          {!isLoading && (
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {query ? `${filtered.length} van ${users.length}` : users.length}
            </span>
          )}
        </div>

        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="crew-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op naam, Discord of alias…"
            aria-label="Zoek leden"
            className="input-field pl-10 pr-9"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Zoekopdracht wissen"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-surface rounded-xl px-3 py-2.5 animate-pulse flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-400">
            <Users size={36} className="opacity-30" />
            <p className="text-sm font-semibold">
              Geen resultaten voor &ldquo;{query}&rdquo;
            </p>
            <button onClick={() => setQuery("")} className="text-xs text-sky-500 underline">
              Wis zoekopdracht
            </button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filtered.map((u) => {
              const badges = getUserBadges(u);
              return (
                <motion.button
                  key={u.name}
                  variants={cardItem}
                  onClick={(e) => openPopup(u, e)}
                  className="card-surface rounded-xl px-3 py-2.5 flex items-center gap-3 text-left
                             hover:shadow-md active:scale-[0.98] transition-all duration-150 cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <UserAvatar name={u.name} user={u} className="h-9 w-9 text-sm" />
                    {u.live_location_ping && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold leading-tight truncate text-slate-900 dark:text-white"
                      style={u.color ? { color: u.color } : undefined}
                    >
                      {u.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {u.discord_username && (
                        <span className="text-[10px] text-slate-400 truncate">{u.discord_username}</span>
                      )}
                      {u.hotel_room && (
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                          <BedDouble size={9} />
                          {u.hotel_room}
                        </span>
                      )}
                    </div>
                  </div>

                  {badges.length > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {badges.slice(0, 3).map((b) => (
                        <BadgeIcon key={b.id} badge={b} size="sm" />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </section>

      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={anchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents}
      />

      <LocationPingModal
        open={pingOpen}
        onClose={() => setPingOpen(false)}
        userNames={users.map((u) => u.name)}
      />
    </div>
  );
}
