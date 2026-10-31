import { Link } from "react-router-dom";
import { Clock, MapPin, Banknote, UserCheck, UserMinus, UserPlus } from "lucide-react";
import { HeroActions, HeroButton } from "../common/HeroActions";
import { HeroPeople } from "../common/HeroPeople";
import { formatAmount, formatDateTime } from "../../utils/format";
import { routes } from "../../config/routes";
import { useIsViewer } from "../../hooks/useIsViewer";
import { useIsOnList } from "../../hooks/useIsOnList";
import { mealCategory } from "../../utils/mealCategory";
import type { CalendarEvent, Meal } from "../../types";

interface MealHeroProps {
  meal: Meal;
  linkedEvent?: CalendarEvent;
  onRsvpClick: () => void;
  onCancelClick: () => void;
}

/** Flat ink hero for an activity: kicker, name in the display face, the facts, and the sign-up row. */
export function MealHero({ meal, linkedEvent, onRsvpClick, onCancelClick }: MealHeroProps) {
  const viewer = useIsViewer();
  const participants = meal.participants ?? [];
  const onList = useIsOnList(participants);
  const category = mealCategory(meal);

  return (
    <section className="overflow-hidden rounded-hero border-2 border-outline bg-hero text-hero-ink">
      <div className="px-5 py-5 sm:px-7 sm:py-6">
        {/* One kicker line: what kind of activity, and of which trip. */}
        <p className="mb-2 text-xs font-medium text-hero-ink/75">
          {category.name}
          {linkedEvent && (
            <>
              {" · "}
              <Link to={routes.event.view(linkedEvent.id)} className="hit-area underline-offset-2 hover:underline">
                {linkedEvent.event_name}
              </Link>
            </>
          )}
        </p>

        <h1 className="line-clamp-3 break-words font-display text-[30px] font-extrabold uppercase leading-[0.95] tracking-[0.005em] text-hero-ink sm:line-clamp-none sm:text-[42px]">
          {meal.meal_name}
        </h1>

        {meal.description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-hero-ink/75">{meal.description}</p>
        )}

        {/* The facts, as lines: when, where, what it costs. */}
        <ul className="mt-4 space-y-1.5 text-sm text-hero-ink">
          <li className="flex items-start gap-2">
            <Clock size={14} className="mt-[3px] shrink-0 text-hero-ink/70" />
            <span>{formatDateTime(meal.time)}</span>
          </li>
          {meal.location && (
            <li className="flex items-start gap-2">
              <MapPin size={14} className="mt-[3px] shrink-0 text-hero-ink/70" />
              <span className="min-w-0 break-words">{meal.location}</span>
            </li>
          )}
          {category.has_cost && meal.cost > 0 && (
            <li className="flex items-start gap-2">
              <Banknote size={14} className="mt-[3px] shrink-0 text-hero-ink/70" />
              <span className="tabular-nums">{formatAmount(meal.cost)} p.p.</span>
            </li>
          )}
        </ul>

        {/* Who is coming and the sign-up: only for kinds of activity people sign up for (not the group photo).
            "Aanmelden" until you are on the list, then "Afmelden" and the way to sign up someone else
            (members may act for anyone). All standard blue buttons. */}
        {category.has_signup && (participants.length > 0 || !viewer) && (
          <HeroPeople names={participants} singular="aanmelding" plural="aanmeldingen">
            {!viewer && (
              <HeroActions>
                {onList ? (
                  <>
                    <HeroButton onClick={onCancelClick}>
                      <UserMinus size={14} /> Afmelden
                    </HeroButton>
                    <HeroButton onClick={onRsvpClick}>
                      <UserPlus size={14} /> Iemand aanmelden
                    </HeroButton>
                  </>
                ) : (
                  <HeroButton onClick={onRsvpClick}>
                    <UserCheck size={14} /> Aanmelden
                  </HeroButton>
                )}
              </HeroActions>
            )}
          </HeroPeople>
        )}
      </div>
    </section>
  );
}
