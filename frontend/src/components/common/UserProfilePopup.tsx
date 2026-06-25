import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { routes } from "../../config/routes";
import { BedDouble, Phone, MapPin, Pencil, CalendarDays } from "lucide-react";
import { avatarColor } from "../../utils/avatar";
import { LocationPingDisplay } from "./LocationPingDisplay";
import { useUser } from "../../hooks/useUsers";
import type { User, CalendarEvent } from "../../types";

const FONT_MAP: Record<string, string> = {
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  cursive: "cursive",
  display: 'Impact, "Arial Black", sans-serif',
};

function getBannerStyle(bannerColor: string, bannerUrl?: string): React.CSSProperties {
  if (bannerUrl) return { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
  if (bannerColor) return { backgroundColor: bannerColor };
  return { background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)" };
}

const CARD_W = 272;
const CARD_H_EST = 460;
const MARGIN = 10;

export interface AnchorRect {
  top: number;
  left: number;
  right: number;
  height: number;
}

interface UserProfilePopupProps {
  user: User | null;
  open: boolean;
  isOwn: boolean;
  anchorRect: AnchorRect;
  onClose: () => void;
  calendarEvents?: CalendarEvent[];
}

export function UserProfilePopup({
  user,
  open,
  isOwn,
  anchorRect,
  onClose,
  calendarEvents,
}: UserProfilePopupProps) {
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => { setImgErr(false); }, [user?.avatar_url]);

  // Fetch full profile (includes discord_username not in the list endpoint)
  const { data: fullUser } = useUser(open && user?.id ? user.id : "");
  const u = fullUser ?? user;

  const hasAvatar = !!u?.avatar_url && !imgErr;
  const bannerStyle = getBannerStyle(u?.banner_color ?? "", u?.banner_url ?? undefined);
  const nameStyle: React.CSSProperties = u
    ? {
        color: u.color || undefined,
        fontFamily:
          u.font && u.font !== "default" ? FONT_MAP[u.font] : undefined,
      }
    : {};

  const hasDetails = !!(u?.hotel_room || u?.phone_number || u?.live_location_ping || u?.discord_username);

  // Filter to events this user is attending (future or ongoing)
  const userEvents = u && calendarEvents
    ? calendarEvents.filter((ev) => ev.participants.includes(u.name))
    : [];
  const visibleEvents = userEvents.slice(0, 3);
  const hiddenCount = userEvents.length - visibleEvents.length;

  // Position popup overlapping the list, starting just after the avatar column.
  // This creates a clear visual connection between the popup and the clicked row.
  const viewW = typeof window !== "undefined" ? window.innerWidth : 1000;
  const viewH = typeof window !== "undefined" ? window.innerHeight : 800;

  const idealLeft = anchorRect.left + 52;
  const left = Math.max(MARGIN, Math.min(idealLeft, viewW - CARD_W - MARGIN));

  const idealTop = anchorRect.top + anchorRect.height / 2 - Math.round(CARD_H_EST * 0.38);
  const top = Math.max(MARGIN, Math.min(idealTop, viewH - CARD_H_EST - MARGIN));

  return createPortal(
    <AnimatePresence>
      {open && user && (
        <>
          {/* Dimmed backdrop — no blur, list stays readable */}
          <motion.div
            key="popup-bg"
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.28)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            key="popup-card"
            className="fixed z-[101] pointer-events-auto"
            style={{ top, left, width: CARD_W }}
            initial={{ x: -20, opacity: 0, scale: 0.96 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -20, opacity: 0, scale: 0.96 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 380,
              opacity: { duration: 0.12 },
              scale: { duration: 0.18 },
            }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                boxShadow:
                  "0 24px 64px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              {/* ── Banner ────────────────────────────────────────────────── */}
              <div className="relative h-[100px]" style={bannerStyle}>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
              </div>

              {/* ── Body ──────────────────────────────────────────────────── */}
              <div className="bg-white dark:bg-[#1e293b]">
                <div className="px-4 pt-0 pb-4">

                  {/* Avatar — 72px, -mt-9 (36px = exact half) */}
                  <div className="-mt-9 mb-2">
                    <div
                      className={`relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border-[5px] border-white dark:border-[#1e293b] overflow-hidden bg-gradient-to-br text-2xl font-black text-white ${!hasAvatar ? avatarColor(u!.name) : ""}`}
                      style={{
                        boxShadow: "0 8px 28px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)",
                        ...(!hasAvatar && u?.color ? { backgroundColor: u.color, backgroundImage: "none" } : {}),
                      }}
                    >
                      {hasAvatar ? (
                        <img
                          src={u!.avatar_url}
                          alt={u!.name}
                          className="h-full w-full object-cover"
                          onError={() => setImgErr(true)}
                        />
                      ) : (
                        u!.name[0].toUpperCase()
                      )}
                    </div>
                  </div>

                  {/* Name + pronouns */}
                  <p
                    className="text-[17px] font-black text-slate-900 dark:text-white leading-tight"
                    style={nameStyle}
                  >
                    {u!.name}
                  </p>
                  {u?.pronouns && (
                    <p className="mt-0.5 text-[11px] text-slate-400 font-medium">
                      {u.pronouns}
                    </p>
                  )}

                  {/* Bio */}
                  {u?.bio && (
                    <div className="mt-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 px-3 py-2.5">
                      <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {u.bio}
                      </p>
                    </div>
                  )}

                  {/* Info section */}
                  {hasDetails && (
                    <div className={`${u?.bio ? "mt-3 pt-3 border-t border-slate-100 dark:border-slate-700" : "mt-3"}`}>
                      <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                        Info
                      </p>
                      <div className="space-y-1.5">
                        {u?.discord_username && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-900/30">
                              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-indigo-500"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.033.056a19.91 19.91 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                            </div>
                            <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                              @{u.discord_username}
                            </span>
                          </div>
                        )}
                        {u?.hotel_room && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                              <BedDouble size={11} className="text-slate-400" />
                            </div>
                            <span className="text-[12px] text-slate-500 dark:text-slate-400">
                              Kamer {u.hotel_room}
                            </span>
                          </div>
                        )}
                        {u?.phone_number && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                              <Phone size={11} className="text-slate-400" />
                            </div>
                            <a
                              href={`tel:${u.phone_number}`}
                              className="text-[12px] text-sky-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {u.phone_number}
                            </a>
                          </div>
                        )}
                        {u?.live_location_ping && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-900/30">
                              <MapPin size={11} className="text-emerald-500" />
                            </div>
                            <LocationPingDisplay raw={u.live_location_ping} align="start" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {visibleEvents.length > 0 && (
                    <div className={`mt-3 pt-3 border-t border-slate-100 dark:border-slate-700`}>
                      <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                        Gaat naar
                      </p>
                      <div className="space-y-1.5">
                        {visibleEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5"
                          >
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-100 dark:bg-sky-900/30">
                              <CalendarDays size={10} className="text-sky-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                                {ev.event_name}
                              </p>
                              <p className="text-[10px] text-slate-400 leading-none mt-0.5">{ev.date}</p>
                            </div>
                          </div>
                        ))}
                        {hiddenCount > 0 && (
                          <p className="text-center text-[10px] text-slate-400 pt-0.5">
                            +{hiddenCount} meer evenement{hiddenCount > 1 ? "en" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Profile button */}
                {isOwn && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(routes.profile.view(u?.id ?? u?.name ?? ""));
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl gradient-brand py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
                    >
                      <Pencil size={13} />
                      Profiel bewerken
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
