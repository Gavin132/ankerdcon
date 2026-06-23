import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BedDouble, Phone, MapPin, Pencil, CalendarDays } from "lucide-react";
import { avatarColor } from "../../utils/avatar";
import { LocationPingDisplay } from "./LocationPingDisplay";
import type { User, CalendarEvent } from "../../types";

const FONT_MAP: Record<string, string> = {
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  cursive: "cursive",
  display: 'Impact, "Arial Black", sans-serif',
};

function getBannerStyle(bannerColor: string, nameColor: string): React.CSSProperties {
  if (bannerColor) return { backgroundColor: bannerColor };
  if (nameColor) return { backgroundColor: nameColor };
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

  const bannerStyle = getBannerStyle(user?.banner_color ?? "", user?.color ?? "");
  const nameStyle: React.CSSProperties = user
    ? {
        color: user.color || undefined,
        fontFamily:
          user.font && user.font !== "default" ? FONT_MAP[user.font] : undefined,
      }
    : {};

  const hasDetails = !!(user?.hotel_room || user?.phone_number || user?.live_location_ping);

  // Filter to events this user is attending (future or ongoing)
  const userEvents = user && calendarEvents
    ? calendarEvents.filter((ev) => ev.participants.includes(user.name))
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
                      className={`relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border-[5px] border-white dark:border-[#1e293b] bg-gradient-to-br text-2xl font-black text-white ${avatarColor(user.name)}`}
                      style={{
                        boxShadow: "0 8px 28px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)",
                        ...(user.color ? { backgroundColor: user.color, backgroundImage: "none" } : {}),
                      }}
                    >
                      {user.name[0].toUpperCase()}
                    </div>
                  </div>

                  {/* Name + pronouns */}
                  <p
                    className="text-[17px] font-black text-slate-900 dark:text-white leading-tight"
                    style={nameStyle}
                  >
                    {user.name}
                  </p>
                  {user.pronouns && (
                    <p className="mt-0.5 text-[11px] text-slate-400 font-medium">
                      {user.pronouns}
                    </p>
                  )}

                  {/* Bio */}
                  {user.bio && (
                    <div className="mt-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 px-3 py-2.5">
                      <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {user.bio}
                      </p>
                    </div>
                  )}

                  {/* Info section */}
                  {hasDetails && (
                    <div className={`${user.bio ? "mt-3 pt-3 border-t border-slate-100 dark:border-slate-700" : "mt-3"}`}>
                      <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                        Info
                      </p>
                      <div className="space-y-1.5">
                        {user.hotel_room && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                              <BedDouble size={11} className="text-slate-400" />
                            </div>
                            <span className="text-[12px] text-slate-500 dark:text-slate-400">
                              Kamer {user.hotel_room}
                            </span>
                          </div>
                        )}
                        {user.phone_number && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                              <Phone size={11} className="text-slate-400" />
                            </div>
                            <a
                              href={`tel:${user.phone_number}`}
                              className="text-[12px] text-sky-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {user.phone_number}
                            </a>
                          </div>
                        )}
                        {user.live_location_ping && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-900/30">
                              <MapPin size={11} className="text-emerald-500" />
                            </div>
                            <LocationPingDisplay raw={user.live_location_ping} align="start" />
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
                            key={ev.event_id}
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
                        navigate(`/profile/${encodeURIComponent(user.name)}`);
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
