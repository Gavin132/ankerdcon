import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AvatarStack } from "./AvatarStack";
import { Collapse } from "./Collapse";
import { UserAvatar } from "./UserAvatar";
import { UserProfilePopup, type AnchorRect } from "./UserProfilePopup";
import { useCalendar } from "../../hooks/useCalendar";
import { useUsers } from "../../hooks/useUsers";
import { useAuthStore } from "../../store/auth.store";
import { groupPeople } from "../../utils/people";

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

interface HeroPeopleProps {
  /** The stored names of the list (participants, passengers): one person under two names shows and counts once. */
  names: string[];
  /** "aanmelding" / "aanmeldingen", "meerijder" / "meerijders". */
  singular: string;
  plural: string;
  /** The actions at the end of the row (`HeroActions`). */
  children?: ReactNode;
}

/**
 * The sign-up row at the bottom of a meal or ride hero: the faces of who is on the list with their count (tap for
 * the names, tap a name for the profile) and, at the end, the actions. One component for both heroes, so they
 * count, open and look the same.
 */
export function HeroPeople({ names, singular, plural, children }: HeroPeopleProps) {
  const { data: users = [] } = useUsers();
  const { data: calendarEvents } = useCalendar();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [open, setOpen] = useState(false);
  const [popupUser, setPopupUser] = useState<(typeof users)[number] | null>(null);
  const [anchorRect, setAnchorRect] = useState<AnchorRect>(CLOSED_RECT);
  const people = groupPeople(names, users);

  function openPopup(user: (typeof users)[number], e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
    setPopupUser(user);
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-t border-dashed border-hero-ink/20 pt-4">
        {people.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="hit-area flex min-w-0 max-w-full items-center gap-3 rounded-lg text-left"
          >
            <AvatarStack names={names} max={5} onDark />
            <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-hero-ink/75">
              <span className="font-mono font-semibold tabular-nums text-hero-ink">{people.length}</span>{" "}
              {people.length === 1 ? singular : plural}
              <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </span>
          </button>
        )}
        {children}
      </div>

      {/* Who is on the list, by name: the faces alone do not say. */}
      <Collapse open={open && people.length > 0}>
        <div className="flex flex-wrap gap-2 pt-3">
          {people.map((person) => {
            const inner = (
              <>
                <UserAvatar name={person.name} user={person.user} className="h-5 w-5 text-[8px] !border-0" />
                {person.name}
              </>
            );
            const cls =
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-hero-ink/25 bg-hero-ink/10 py-1 pl-1.5 pr-3 text-xs font-medium text-hero-ink";
            return person.user ? (
              <button
                key={person.names[0]}
                type="button"
                onClick={(e) => openPopup(person.user!, e)}
                className={`hit-area ${cls} transition-colors hover:bg-hero-ink/20`}
              >
                {inner}
              </button>
            ) : (
              <span key={person.names[0]} className={cls}>{inner}</span>
            );
          })}
        </div>
      </Collapse>

      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={anchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents}
      />
    </>
  );
}
