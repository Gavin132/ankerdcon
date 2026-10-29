import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { routes } from "../../config/routes";
import { Phone, MapPin, Pencil, CalendarDays, User as UserIcon, BedDouble } from "lucide-react";
import { avatarColor, avatarSrc } from "../../utils/avatar";
import { FONT_MAP, getBannerStyle, readableNameColor } from "../../utils/profile";
import { useThemeStore } from "../../store/theme.store";
import { LocationPingDisplay } from "./LocationPingDisplay";
import { isPingFresh } from "../../utils/locationPing";
import { useCurrentTripRoomNumbers } from "../../hooks/useTripRooms";
import { BadgeIcon } from "./BadgeIcon";
import { DiscordIcon } from "./DiscordIcon";
import { useUser } from "../../hooks/useUsers";
import { useBadges } from "../../hooks/useBadges";
import { parseEventDate } from "../../utils/date";
import { groupCalendarEntries, getGroupTitle, formatDateRange } from "../../utils/multiDay";
import type { User, CalendarEvent } from "../../types";
import { useBackClose } from "../../hooks/useBackClose";

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
  const isDark = useThemeStore((s) => s.isDark);
  useBackClose(open, onClose);
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => {
    setImgErr(false);
  }, [user?.avatar_url]);

  // Fetch full profile (includes discord_username not in the list endpoint)
  const { data: fullUser } = useUser(open && user?.id ? user.id : "");
  const { data: allBadges = [] } = useBadges();
  const u = fullUser ?? user;

  const userBadges = (u?.badge_ids ?? [])
    .map((id) => allBadges.find((b) => b.id === id))
    .filter(Boolean)
    .sort((a, b) => a!.display_order - b!.display_order) as typeof allBadges;

  const roomNumbers = useCurrentTripRoomNumbers();
  const hasAvatar = !!u?.avatar_url && !imgErr;
  const bannerStyle = getBannerStyle(
    u?.banner_color ?? "",
    u?.banner_url ?? undefined,
  );
  const nameStyle: React.CSSProperties = u
    ? {
        color: readableNameColor(u.color, isDark),
        fontFamily:
          u.font && u.font !== "default" ? FONT_MAP[u.font] : undefined,
      }
    : {};

  const room = u ? roomNumbers.get(u.name.toLowerCase()) : undefined;
  const hasDetails = !!(
    room ||
    u?.phone_number ||
    isPingFresh(u?.live_location_ping) ||
    u?.discord_username
  );

  // Events this user is attending (future or ongoing), collapsed so a
  // multi-day trip shows once as its parent event rather than one row per day.
  const userEventEntries =
    u && calendarEvents
      ? calendarEvents
          .filter((ev) => ev.participants.includes(u.name))
          .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
          .filter((x): x is { ev: CalendarEvent; date: Date } => x.date !== null)
      : [];
  const userEventItems = groupCalendarEntries(userEventEntries);
  const visibleEventItems = userEventItems.slice(0, 3);
  const hiddenCount = userEventItems.length - visibleEventItems.length;

  // Position popup overlapping the list, starting just after the avatar column.
  // This creates a clear visual connection between the popup and the clicked row.
  const viewW = typeof window !== "undefined" ? window.innerWidth : 1000;
  const viewH = typeof window !== "undefined" ? window.innerHeight : 800;

  const idealLeft = anchorRect.left + 52;
  const left = Math.max(MARGIN, Math.min(idealLeft, viewW - CARD_W - MARGIN));

  const idealTop =
    anchorRect.top + anchorRect.height / 2 - Math.round(CARD_H_EST * 0.38);
  const top = Math.max(MARGIN, Math.min(idealTop, viewH - CARD_H_EST - MARGIN));

  return createPortal(
    <AnimatePresence>
      {open && user && (
        <>
          {/* Dimmed backdrop — no blur, list stays readable */}
          <motion.div
            key="popup-bg"
            className="fixed inset-0 z-[230] bg-scrim/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            key="popup-card"
            className="fixed z-[231] flex flex-col pointer-events-auto"
            style={{ top, left, width: CARD_W, maxHeight: viewH - top - MARGIN }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden card-surface shadow-xl">
              {/* Banner and body scroll together when they don't fit (someone going
                  to many events, a small phone); the profile button below stays put. */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* ── Banner ────────────────────────────────────────────────── */}
              <div className="h-[92px]" style={bannerStyle} />

              {/* ── Body ──────────────────────────────────────────────────── */}
              <div>
                <div className="px-4 pt-0 pb-4">
                  {/* Avatar — 68px, overlapping the banner by half */}
                  <div className="-mt-[34px] mb-2">
                    <div
                      className={`relative z-10 flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full border-[4px] border-surface text-2xl font-bold text-avatar-on ${!hasAvatar ? `bg-gradient-to-br ${avatarColor(u!.name)}` : ""}`}
                      style={
                        !hasAvatar && u?.color
                          ? { backgroundColor: u.color, backgroundImage: "none" }
                          : undefined
                      }
                    >
                      {hasAvatar ? (
                        <img
                          src={avatarSrc(u!.avatar_url!, 96)}
                          alt={u!.name}
                          className="h-full w-full object-cover"
                          onError={() => setImgErr(true)}
                        />
                      ) : (
                        u!.name[0].toUpperCase()
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <p
                    className="break-words font-display text-[24px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-ink"
                    style={nameStyle}
                  >
                    {u!.name}
                  </p>

                  {/* Pronouns · Aliases · Badges */}
                  {(u?.pronouns || (u?.aliases?.length ?? 0) > 0 || userBadges.length > 0) && (() => {
                    const aliases = u?.aliases ?? [];
                    const visibleAliases = aliases.slice(0, 4);
                    const hiddenAliases = aliases.length - visibleAliases.length;
                    const segments: React.ReactNode[] = [];

                    if (u?.pronouns) {
                      segments.push(
                        <span key="pronouns" className="text-[12px] text-ink-2">{u.pronouns}</span>
                      );
                    }
                    if (visibleAliases.length > 0) {
                      segments.push(
                        <span key="aliases" className="text-[12px] text-ink-3">
                          {visibleAliases.join(", ")}{hiddenAliases > 0 ? ` +${hiddenAliases}` : ""}
                        </span>
                      );
                    }
                    if (userBadges.length > 0) {
                      segments.push(
                        <span key="badges" className="flex items-center gap-0.5">
                          {userBadges.map((badge) => (
                            <BadgeIcon key={badge.id} badge={badge} size="sm" />
                          ))}
                        </span>
                      );
                    }

                    return (
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        {segments.map((seg, i) => (
                          <span key={i} className="flex items-center gap-1.5">
                            {i > 0 && <span className="select-none text-ink-3">·</span>}
                            {seg}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Bio */}
                  {u?.bio && (
                    <div className="mt-2.5 rounded-lg bg-sunken px-3 py-2.5">
                      <p className="text-[12.5px] leading-relaxed text-ink-2">
                        {u.bio}
                      </p>
                    </div>
                  )}

                  {/* Info section */}
                  {hasDetails && (
                    <div
                      className={`${u?.bio ? "mt-3 pt-3 border-t border-line" : "mt-3"}`}
                    >
                      <p className="section-label mb-2">
                        Info
                      </p>
                      <div className="space-y-1.5">
                        {u?.discord_username && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sunken text-ink-2">
                              <DiscordIcon size={12} />
                            </div>
                            <span className="text-[12px] font-medium text-ink-2">
                              @{u.discord_username}
                            </span>
                          </div>
                        )}
                        {room && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sunken text-ink-2">
                              <BedDouble size={12} />
                            </div>
                            <span className="text-[12px] text-ink-2">Kamer {room}</span>
                          </div>
                        )}
                        {u?.phone_number && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sunken text-ink-2">
                              <Phone size={12} />
                            </div>
                            <a
                              href={`tel:${u.phone_number}`}
                              className="inline-block py-1.5 text-[12px] font-medium text-brand-text"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {u.phone_number}
                            </a>
                          </div>
                        )}
                        {isPingFresh(u?.live_location_ping) && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md pill-ok">
                              <MapPin size={12} />
                            </div>
                            <LocationPingDisplay
                              raw={u!.live_location_ping}
                              align="start"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {visibleEventItems.length > 0 && (
                    <div
                      className="mt-3 pt-3 border-t border-line"
                    >
                      <p className="section-label mb-2">
                        Gaat naar
                      </p>
                      <div className="space-y-1.5">
                        {visibleEventItems.map((item) => {
                          const name = item.type === "single" ? item.ev.event_name : getGroupTitle(item.events);
                          const dateLabel = item.type === "single" ? item.ev.date : formatDateRange(item.events.map((x) => x.date));
                          const key = item.type === "single" ? item.ev.id : item.multiDayId;
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-2 rounded-lg bg-sunken px-2.5 py-1.5"
                            >
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface text-ink-2">
                                <CalendarDays size={12} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-semibold leading-tight text-ink">
                                  {name}
                                </p>
                                <p className="mt-0.5 font-mono text-[12px] leading-none text-ink-3">
                                  {dateLabel}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {hiddenCount > 0 && (
                          <p className="pt-0.5 text-center text-[12px] text-ink-3">
                            +{hiddenCount} meer evenement
                            {hiddenCount > 1 ? "en" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>

              {/* Full profile — edit your own, view anyone else's */}
              <div className="shrink-0 px-3 pb-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    navigate(routes.profile.view(u?.id ?? u?.name ?? ""));
                  }}
                  className="btn-primary w-full py-2.5 text-[13px]"
                >
                  {isOwn ? <Pencil size={14} /> : <UserIcon size={14} />}
                  {isOwn ? "Profiel bewerken" : "Bekijk profiel"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
