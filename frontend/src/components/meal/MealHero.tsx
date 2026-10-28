import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Banknote, Bus, CalendarDays, ChevronDown, UserCheck, UserMinus } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { Collapse } from "../common/Collapse";
import { HeroActions, HeroChip, HeroPrimaryButton, HeroSecondaryButton, heroChipClass } from "../common/HeroActions";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { useCalendar } from "../../hooks/useCalendar";
import { useAuthStore } from "../../store/auth.store";
import { formatAmount, formatDateTime } from "../../utils/format";
import { groupPeople } from "../../utils/people";
import { routes } from "../../config/routes";
import { useIsViewer } from "../../hooks/useIsViewer";
import { mealCategory } from "../../utils/mealCategory";
import type { CalendarEvent, Meal, User } from "../../types";

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

interface MealHeroProps {
  meal: Meal;
  linkedEvent?: CalendarEvent;
  users: User[];
  onRsvpClick: () => void;
  onCancelClick: () => void;
}

/** Flat ink hero for an activity: name in the display face, mono chips, brand-blue "Aanmelden". */
export function MealHero({ meal, linkedEvent, users, onRsvpClick, onCancelClick }: MealHeroProps) {
  const viewer = useIsViewer();
  const { data: calendarEvents } = useCalendar();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>(CLOSED_RECT);
  const [namesOpen, setNamesOpen] = useState(false);
  // One entry per person, not per name they are on the list under (utils/people.ts).
  const participants = groupPeople(meal.participants ?? [], users).map((person) => person.name);
  const category = mealCategory(meal);

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
    <section className="overflow-hidden rounded-[14px] border-2 border-outline bg-hero text-hero-ink">
      <div className="px-5 py-5 sm:px-7 sm:py-6">

        <div className="mb-3 flex flex-wrap gap-1.5">
          <HeroChip className="!border-white/40 !bg-white/20">{category.name}</HeroChip>
          {linkedEvent && (
            <Link
              to={routes.event.view(linkedEvent.id)}
              className={`${heroChipClass()} transition-colors hover:bg-white/20`}
            >
              <CalendarDays size={11} />
              {linkedEvent.event_name}
            </Link>
          )}
        </div>

        <h1 className="break-words font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] text-hero-ink sm:text-[42px]">
          {meal.meal_name}
        </h1>

        {meal.description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
            {meal.description}
          </p>
        )}

        {/* Chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <HeroChip>
            <Clock size={11} />
            {formatDateTime(meal.time)}
          </HeroChip>
          {meal.location && (
            <HeroChip className="min-w-0 !items-start normal-case tracking-normal">
              <MapPin size={11} className="mt-[3px] shrink-0" />
              {meal.location}
            </HeroChip>
          )}
          {category.has_cost && meal.cost > 0 && (
            <HeroChip className="tabular-nums">
              <Banknote size={11} />
              {formatAmount(meal.cost)} p.p.
            </HeroChip>
          )}
          {category.has_transport && meal.transport_needed && (
            <HeroChip>
              <Bus size={11} />
              Vervoer nodig
            </HeroChip>
          )}
        </div>

        {/* Attendees + sign-up: only for kinds of activity people sign up for (not the group photo). */}
        {category.has_signup && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-white/20 pt-4">
          {participants.length > 0 && (
            <button
              type="button"
              onClick={() => setNamesOpen((v) => !v)}
              aria-expanded={namesOpen}
              className="flex min-w-0 max-w-full items-center gap-3 rounded-lg text-left"
            >
              <span className="flex shrink-0 -space-x-2">
                {participants.slice(0, 6).map((p) => {
                  const u = resolveUser(p);
                  return <UserAvatar key={p} name={u?.name ?? p} user={u} className="h-7 w-7 text-[12px] !border-hero" />;
                })}
                {participants.length > 6 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-hero bg-white/15 font-mono text-[12px] font-semibold text-hero-ink">
                    +{participants.length - 6}
                  </span>
                )}
              </span>
              <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-white/65">
                <span className="font-mono font-semibold tabular-nums text-hero-ink">{participants.length}</span>{" "}
                {participants.length === 1 ? "aanmelding" : "aanmeldingen"}
                <ChevronDown size={13} className={`transition-transform ${namesOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
          )}
          {!viewer && (
          <HeroActions>
            {participants.length > 0 && (
              <HeroSecondaryButton onClick={onCancelClick}>
                <UserMinus size={14} /> Afmelden
              </HeroSecondaryButton>
            )}
            <HeroPrimaryButton onClick={onRsvpClick}>
              <UserCheck size={14} /> Aanmelden
            </HeroPrimaryButton>
          </HeroActions>
          )}
        </div>
        )}

        {/* Who's on the list, by name — the avatars alone don't say. */}
        <Collapse open={namesOpen && participants.length > 0}>
          <div className="flex flex-wrap gap-1.5 pt-3">
            {participants.map((p) => {
              const u = resolveUser(p);
              const chip = (
                <>
                  <UserAvatar name={u?.name ?? p} user={u} className="h-5 w-5 text-[8px] !border-0" />
                  {u?.name ?? p}
                </>
              );
              const cls = "inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 py-1 pl-1 pr-2.5 text-xs font-medium text-hero-ink";
              return u ? (
                <button key={p} type="button" onClick={(e) => openPopup(u, e)} className={`${cls} transition-colors hover:bg-white/20`}>
                  {chip}
                </button>
              ) : (
                <span key={p} className={cls}>{chip}</span>
              );
            })}
          </div>
        </Collapse>
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
