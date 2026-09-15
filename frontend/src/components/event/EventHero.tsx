import { useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, MapPin, UserCheck, UserMinus, UtensilsCrossed } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { AttendanceSummary } from "./AttendanceSummary";
import { useAuthStore } from "../../store/auth.store";
import { useCalendar } from "../../hooks/useCalendar";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, User } from "../../types";

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

interface EventHeroProps {
  event: CalendarEvent;
  daysUntil: number | null;
  users: User[];
  meals?: Meal[];
  onRsvpClick: () => void;
  onCancelClick: () => void;
  /** Every day of the trip, for the "most people attend X–Y" summary —
   * omit for a single-day event (nothing to summarize). */
  groupDays?: { ev: CalendarEvent; date: Date }[];
}

export function EventHero({ event, daysUntil, users, meals = [], onRsvpClick, onCancelClick, groupDays }: EventHeroProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: calendarEvents } = useCalendar();
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>(CLOSED_RECT);

  function resolveUser(stored: string) {
    return users.find(
      (u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored),
    );
  }

  function openPopup(user: User, e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
    setPopupUser(user);
  }

  const isPast = daysUntil !== null && daysUntil < 0;
  const isToday = daysUntil === 0;

  const chip =
    "inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-2 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#E6F0F3]";
  const chipLink = `${chip} transition-colors hover:border-white/60`;

  return (
    <div
      className={`relative overflow-hidden rounded-[14px] border-2 border-outline bg-[#0F1519] text-[#E6F0F3] ${isPast ? "opacity-75" : ""}`}
    >
      {/* Cover image (if set) under a flat dark overlay for legibility */}
      {event.image_url && (
        <>
          <img
            src={event.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div aria-hidden className="absolute inset-0 bg-[#0F1519]/60" />
        </>
      )}

      {/* Content */}
      <div className="relative px-4 py-5 sm:px-6 sm:py-6">

        {/* Top chips row */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {(isToday || daysUntil === 1) && (
            <span
              className={
                isToday
                  ? "inline-flex items-center rounded-md border border-brand bg-brand px-2 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-brand-on"
                  : chip
              }
            >
              {isToday ? "Vandaag 🎉" : "Morgen!"}
            </span>
          )}
          {isPast && <span className={`${chip} text-[#E6F0F3]/60`}>Afgelopen</span>}
          {event.is_hotel && (
            <span className={chip}>
              <BedDouble size={11} /> Hotel
            </span>
          )}
          {event.has_con === false && !event.is_party && (
            <span className={chip}>
              <BedDouble size={11} /> Reisdag
            </span>
          )}
          {event.location && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={chipLink}
            >
              <MapPin size={11} className="shrink-0" /> <span className="truncate">{event.location}</span>
            </a>
          )}
          {meals.length > 0 && (
            <Link to={routes.meal.view(meals[0].id)} className={`${chipLink} max-w-[220px]`}>
              <UtensilsCrossed size={11} className="shrink-0" />
              <span className="truncate">{meals[0].meal_name}</span>
              {meals.length > 1 && <span className="shrink-0 opacity-60">+{meals.length - 1}</span>}
            </Link>
          )}
        </div>

        {/* Title — the trip name is already the page title above, so this stays a size smaller */}
        <h2 className="font-display text-[26px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] text-[#E6F0F3] sm:text-[30px]">
          {event.event_name}
        </h2>

        {event.description && (
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#E6F0F3]/70">
            {event.description}
          </p>
        )}

        {/* Attendees + sign-up */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {event.participants.length > 0 && (
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {event.participants.slice(0, 8).map((p) => {
                  const u = resolveUser(p);
                  return u ? (
                    <button key={p} type="button" onClick={(e) => openPopup(u, e)} className="rounded-full">
                      <UserAvatar
                        name={u.name}
                        user={u}
                        className="h-8 w-8 text-[10px] !border-[#0F1519]"
                      />
                    </button>
                  ) : (
                    <UserAvatar
                      key={p}
                      name={p}
                      className="h-8 w-8 text-[10px] !border-[#0F1519]"
                    />
                  );
                })}
              </div>
              <p className="text-[13px] text-[#E6F0F3]/70">
                <span className="font-mono font-semibold tabular-nums text-[#E6F0F3]">{event.participants.length}</span>{" "}
                {event.participants.length === 1 ? "aanmelding" : "aanmeldingen"}
              </p>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {event.participants.length > 0 && (
              <button
                type="button"
                onClick={onCancelClick}
                className="inline-flex items-center gap-1.5 rounded-xl border-1.5 border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-3"
              >
                <UserMinus size={14} /> Afmelden
              </button>
            )}
            <button
              type="button"
              onClick={onRsvpClick}
              className="btn-primary px-4 py-2.5 text-sm"
            >
              <UserCheck size={14} /> Aanmelden
            </button>
          </div>
        </div>

        <AttendanceSummary groupDays={groupDays ?? []} />
      </div>

      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={popupAnchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents}
      />
    </div>
  );
}
