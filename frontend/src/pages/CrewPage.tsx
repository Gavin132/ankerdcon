import { useState } from "react";
import { Search, Users, X, BedDouble, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useUsers } from "../hooks/useUsers";
import { useCalendar } from "../hooks/useCalendar";
import { useAuthStore } from "../store/auth.store";
import { useBadges } from "../hooks/useBadges";
import { useCurrentTripRoomNumbers } from "../hooks/useTripRooms";
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
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
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
  const roomNumbers = useCurrentTripRoomNumbers();

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
      <section className="card-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
          <p className="section-label flex items-center gap-1.5">
            <MapPin size={12} />
            Waar is iedereen
          </p>
          <button
            type="button"
            onClick={() => setPingOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border-1.5 border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink-3"
          >
            <MapPin size={13} />
            Locatie pingen
          </button>
        </div>
        {pinged.length === 0 ? (
          <p className="border-t border-line px-4 py-3.5 text-[13px] text-ink-3">
            Nog niemand heeft een locatie gedeeld.
          </p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {pinged.map((u) => (
              <li key={u.name}>
                <button
                  type="button"
                  onClick={(e) => openPopup(u, e)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-sunken"
                >
                  <UserAvatar name={u.name} user={u} className="h-8 w-8 text-xs shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{u.name}</span>
                  <LocationPingDisplay raw={u.live_location_ping} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Leden ──────────────────────────────────────────────────── */}
      <section className="card-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
          <p className="section-label">Leden</p>
          {!isLoading && (
            <span className="font-mono text-[12px] tabular-nums text-ink-3">
              {query ? `${filtered.length} van ${users.length}` : users.length}
            </span>
          )}
        </div>

        <div className="relative px-4 pb-3">
          <Search size={15} className="pointer-events-none absolute left-7 top-[calc(50%-6px)] -translate-y-1/2 text-ink-3" />
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
              className="absolute right-6 top-[calc(50%-6px)] flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="-mb-px grid grid-cols-1 border-t border-line sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 border-b border-line px-4 py-2.5 sm:odd:border-r">
                <div className="h-9 w-9 shrink-0 rounded-full bg-sunken" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-sunken" />
                  <div className="h-2.5 w-16 rounded bg-sunken" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-12 text-center">
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
              <Users size={22} />
            </span>
            <p className="text-sm font-semibold text-ink">
              Geen resultaten voor &ldquo;{query}&rdquo;
            </p>
            <button onClick={() => setQuery("")} className="text-[12.5px] font-semibold text-brand-text hover:underline">
              Wis zoekopdracht
            </button>
          </div>
        ) : (
          <motion.div
            className="-mb-px grid grid-cols-1 border-t border-line sm:grid-cols-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filtered.map((u) => {
              const badges = getUserBadges(u);
              const room = roomNumbers.get(u.name.toLowerCase());
              return (
                <motion.button
                  key={u.name}
                  variants={cardItem}
                  onClick={(e) => openPopup(u, e)}
                  className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 text-left transition-colors duration-150 hover:bg-sunken sm:odd:border-r"
                >
                  <div className="relative shrink-0">
                    <UserAvatar name={u.name} user={u} className="h-9 w-9 text-sm" />
                    {u.live_location_ping && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-surface animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[14px] font-semibold leading-tight text-ink">
                      {u.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {u.discord_username && (
                        <span className="truncate text-[12px] text-ink-3">{u.discord_username}</span>
                      )}
                      {room && (
                        <span className="flex items-center gap-1 font-mono text-[11.5px] text-ink-2">
                          <BedDouble size={11} />
                          {room}
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
