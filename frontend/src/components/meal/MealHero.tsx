import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Banknote, Bus, CalendarDays, UserCheck, UserMinus } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { useCalendar } from "../../hooks/useCalendar";
import { useAuthStore } from "../../store/auth.store";
import { formatDateTime } from "../../utils/format";
import { routes } from "../../config/routes";
import type { CalendarEvent, Meal, User } from "../../types";

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

/** White-ish mono chip on the ink hero. */
const CHIP =
  "inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-2 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#E6F0F3]";

interface MealHeroProps {
  meal: Meal;
  linkedEvent?: CalendarEvent;
  users: User[];
  onRsvpClick: () => void;
  onCancelClick: () => void;
}

/** Flat ink hero for a meal: name in the display face, mono chips, cyan "Aanmelden". */
export function MealHero({ meal, linkedEvent, users, onRsvpClick, onCancelClick }: MealHeroProps) {
  const { data: calendarEvents } = useCalendar();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>(CLOSED_RECT);
  const participants = meal.participants ?? [];

  function resolveUser(stored: string) {
    return users.find(
      (u) =>
        u.name === stored ||
        u.discord_username === stored ||
        u.aliases?.includes(stored),
    );
  }

  function openPopup(user: User, e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
    setPopupUser(user);
  }

  return (
    <section className="overflow-hidden rounded-[14px] border-2 border-outline bg-[#0F1519] text-[#E6F0F3]">
      <div className="px-5 py-5 sm:px-7 sm:py-6">

        {linkedEvent && (
          <Link
            to={routes.event.view(linkedEvent.id)}
            className={`${CHIP} mb-3 transition-colors hover:bg-white/20`}
          >
            <CalendarDays size={11} />
            {linkedEvent.event_name}
          </Link>
        )}

        <h1 className="break-words font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] text-[#E6F0F3] sm:text-[42px]">
          {meal.meal_name}
        </h1>

        {meal.description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
            {meal.description}
          </p>
        )}

        {/* Chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className={CHIP}>
            <Clock size={11} />
            {formatDateTime(meal.time)}
          </span>
          {meal.location && (
            <span className={CHIP}>
              <MapPin size={11} />
              {meal.location}
            </span>
          )}
          {meal.cost > 0 && (
            <span className={`${CHIP} tabular-nums`}>
              <Banknote size={11} />
              €{meal.cost.toFixed(2)} p.p.
            </span>
          )}
          {meal.transport_needed && (
            <span className={CHIP}>
              <Bus size={11} />
              Vervoer nodig
            </span>
          )}
        </div>

        {/* Attendees + sign-up */}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-white/20 pt-4">
          {participants.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {participants.slice(0, 6).map((p) => {
                  const u = resolveUser(p);
                  return u ? (
                    <button key={p} type="button" onClick={(e) => openPopup(u, e)} className="rounded-full" aria-label={u.name}>
                      <UserAvatar
                        name={u.name}
                        user={u}
                        className="h-7 w-7 text-[10px] !border-[#0F1519]"
                      />
                    </button>
                  ) : (
                    <UserAvatar
                      key={p}
                      name={p}
                      className="h-7 w-7 text-[10px] !border-[#0F1519]"
                    />
                  );
                })}
              </div>
              <span className="text-xs font-medium text-white/65">
                <span className="font-mono font-semibold tabular-nums text-[#E6F0F3]">{participants.length}</span>{" "}
                {participants.length === 1 ? "aanmelding" : "aanmeldingen"}
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {participants.length > 0 && (
              <button
                type="button"
                onClick={onCancelClick}
                className="flex items-center gap-1.5 rounded-xl border-1.5 border-white/25 px-3 py-2 text-xs font-semibold text-[#E6F0F3] transition-colors hover:border-white/50"
              >
                <UserMinus size={13} /> Afmelden
              </button>
            )}
            <button
              type="button"
              onClick={onRsvpClick}
              className="btn-primary px-3.5 py-2 text-xs"
            >
              <UserCheck size={13} /> Aanmelden
            </button>
          </div>
        </div>
      </div>

      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={popupAnchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents}
      />
    </section>
  );
}
