import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users, X, BedDouble } from "lucide-react";
import { motion } from "framer-motion";
import { useUsers } from "../hooks/useUsers";
import { useCalendar } from "../hooks/useCalendar";
import { useAuthStore } from "../store/auth.store";
import { useBadges } from "../hooks/useBadges";
import { UserAvatar } from "../components/common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../components/common/UserProfilePopup";
import { BadgeIcon } from "../components/common/BadgeIcon";
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

export function MembersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [anchorRect, setAnchorRect] = useState<AnchorRect>(CLOSED_RECT);

  const { data: users = [], isLoading } = useUsers();
  const { data: calendarEvents } = useCalendar();
  const { data: allBadges = [] } = useBadges();
  const currentUser = useAuthStore((s) => s.currentUser);

  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name, "nl"));
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
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">

      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4
                      bg-white/90 dark:bg-slate-950/90 backdrop-blur-md
                      border-b border-slate-200 dark:border-white/[0.06]">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl
                     text-slate-500 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-white/[0.08]
                     hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-bold text-slate-900 dark:text-white text-sm flex-1">Leden</span>
        {!isLoading && (
          <span className="text-xs font-semibold text-slate-400 shrink-0 tabular-nums">
            {users.length} leden
          </span>
        )}
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 160 }}>
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 15% 50%, #0c4a6edd 0%, transparent 60%),
              radial-gradient(ellipse at 85% 25%, #0f172a 0%, transparent 55%),
              linear-gradient(150deg, #0f172a 0%, #0c4a6e 55%, #075985 100%)
            `,
          }}
        />
        {/* Noise texture */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.12] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <filter id="members-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#members-noise)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
        {/* Watermark */}
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
          <Users size={150} strokeWidth={1} className="text-white" />
        </div>

        <div className="relative px-4 pt-7 pb-9">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300/60 mb-1">
            Ankerd Con
          </p>
          <h1 className="text-2xl font-black text-white drop-shadow-md mb-4">
            Alle leden
          </h1>
          {users.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {users.slice(0, 10).map((u) => (
                  <UserAvatar
                    key={u.name}
                    name={u.name}
                    user={u}
                    className="h-7 w-7 text-[10px] ring-2 ring-black/30"
                  />
                ))}
                {users.length > 10 && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 ring-2 ring-black/30 text-[9px] font-black text-white tabular-nums">
                    +{users.length - 10}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-white/60">
                {users.length} {users.length === 1 ? "lid" : "leden"}
              </span>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />
      </div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op naam, Discord of alias…"
            className="input-field pl-10 pr-9"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      <div className="px-4 pb-10">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-surface rounded-2xl p-4 animate-pulse flex flex-col items-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-700 mb-3" />
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-400">
            <Users size={36} className="opacity-30" />
            <p className="text-sm font-semibold">
              Geen resultaten voor &ldquo;{query}&rdquo;
            </p>
            <button
              onClick={() => setQuery("")}
              className="text-xs text-sky-500 underline"
            >
              Wis zoekopdracht
            </button>
          </div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
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
                    className="card-surface rounded-2xl p-4 flex flex-col items-center text-center
                               hover:shadow-md active:scale-[0.97] transition-all duration-150
                               cursor-pointer relative overflow-hidden"
                  >
                    {/* Avatar with online dot */}
                    <div className="relative mb-3">
                      <UserAvatar
                        name={u.name}
                        user={u}
                        className="h-14 w-14 text-xl rounded-2xl"
                      />
                      {u.live_location_ping && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full
                                     bg-emerald-400 ring-2 ring-white dark:ring-slate-900 animate-pulse"
                        />
                      )}
                    </div>

                    {/* Name */}
                    <p
                      className="text-sm font-bold leading-tight truncate w-full text-slate-900 dark:text-white"
                      style={u.color ? { color: u.color } : undefined}
                    >
                      {u.name}
                    </p>

                    {/* Pronouns */}
                    {u.pronouns && (
                      <p className="mt-0.5 text-[10px] text-slate-400 leading-tight">
                        {u.pronouns}
                      </p>
                    )}

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                        {badges.slice(0, 3).map((b) => (
                          <BadgeIcon key={b.id} badge={b} size="sm" />
                        ))}
                      </div>
                    )}

                    {/* Hotel room */}
                    {u.hotel_room && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                        <BedDouble size={10} />
                        Kamer {u.hotel_room}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            <p className="mt-6 text-center text-xs text-slate-400">
              {query
                ? `${filtered.length} van ${users.length} leden`
                : `${users.length} leden totaal`}
            </p>
          </>
        )}
      </div>

      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={anchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents}
      />
    </div>
  );
}
