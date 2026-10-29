import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { EmptyState } from "../common/EmptyState";
import { TripSheet } from "./TripSheet";
import { routes } from "../../config/routes";
import { dayShort } from "../../utils/multiDay";
import { findUser } from "../../utils/people";
import { tripPeople, type Trip, type TripPhase } from "../../utils/trips";
import type { User } from "../../types";

interface TripParticipantsProps {
  trip: Trip;
  users: User[];
  /** Every name the signed-in user can appear under in `participants`. */
  myNames: string[];
  /** A trip that's over lists who *were* there. */
  phase?: TripPhase;
  /** Adds an "Iemand aanmelden" button to the list, which opens the sign-up form for other members. */
  onManage?: () => void;
  /** What to show as the tap target — normally the avatar stack and "Jij en 3 anderen". */
  children: ReactNode;
}

/**
 * Wraps a row of avatars so tapping it opens the full list of who's on the
 * trip, by name. A trip can have twenty people, and a face alone doesn't say
 * who someone is — especially a profile picture you don't recognise.
 */
export function TripParticipants({ trip, users, myNames, phase, onManage, children }: TripParticipantsProps) {
  const [open, setOpen] = useState(false);
  const count = tripPeople(trip, users).length;

  // With nobody on it there is no list to open, so the way to sign someone up sits right here.
  if (count === 0) {
    return (
      <>
        {children}
        {onManage && (
          <button type="button" onClick={onManage} className="hit-area flex items-center gap-1 text-[12.5px] font-semibold text-brand-text hover:underline">
            <UserPlus size={14} className="shrink-0" />
            Iemand aanmelden
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Bekijk wie er ${phase === "past" ? "waren" : "meegaan"} (${count})`}
        className="hit-area flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left transition-opacity hover:opacity-80 active:opacity-70"
      >
        {children}
        <ChevronRight size={16} className="shrink-0 text-ink-3" aria-hidden />
      </button>
      <ParticipantsSheet open={open} onClose={() => setOpen(false)} trip={trip} users={users} myNames={myNames} phase={phase} onManage={onManage} />
    </>
  );
}

function ParticipantsSheet({
  open,
  onClose,
  trip,
  users,
  myNames,
  phase,
  onManage,
}: Omit<TripParticipantsProps, "children"> & { open: boolean; onClose: () => void }) {
  // Whichever name someone goes by counts: a member signed up as "Sam" on Friday and under their old name on
  // Saturday is one row that says "Alle dagen", not two rows with a day each.
  const isMine = (names: string[]) => names.some((n) => myNames.includes(n));
  const multiDay = trip.days.length > 1;

  const people = tripPeople(trip, users)
    .map((person) => {
      const days = trip.days.filter((d) => (d.ev.participants ?? []).some((n) => person.names.includes(n)));
      return { key: person.names[0], names: person.names, user: person.user ?? findUser(users, person.name), days, display: person.name };
    })
    .sort((a, b) => Number(isMine(b.names)) - Number(isMine(a.names)) || a.display.localeCompare(b.display, "nl"));

  const daysText = (days: typeof people[number]["days"]) =>
    days.length === trip.days.length ? "Alle dagen" : days.map((d) => `${dayShort(d.date)} ${d.date.getDate()}`).join(" · ");

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title={phase === "past" ? "Wie waren er" : "Wie gaan er mee"}
      subtitle={`${trip.title} · ${people.length} ${people.length === 1 ? "persoon" : "personen"}`}
      footer={
        onManage && (
          <button
            type="button"
            onClick={() => {
              // One sheet at a time: close this list, then open the sign-up form.
              onClose();
              onManage();
            }}
            className="btn-secondary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
          >
            <UserPlus size={16} />
            {phase === "past" ? "Aanmeldingen aanpassen" : "Iemand aanmelden"}
          </button>
        )
      }
    >
      {people.length === 0 ? (
        <EmptyState compact icon={<Users size={22} />} title="Nog niemand aangemeld" />
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {people.map(({ key, names, user, days, display }) => {
            const row = (
              <>
                <UserAvatar name={display} user={user} className="h-10 w-10 shrink-0 text-sm" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-semibold text-ink">{display}</span>
                    {isMine(names) && (
                      <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand-text">Jij</span>
                    )}
                  </span>
                  {multiDay && <span className="mt-0.5 block truncate font-mono text-[12px] text-ink-3">{daysText(days)}</span>}
                </span>
              </>
            );
            return (
              <li key={key}>
                {user?.id ? (
                  <Link
                    to={routes.profile.view(user.id)}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-sunken active:bg-sunken"
                  >
                    {row}
                    <ChevronRight size={16} className="shrink-0 text-ink-3" />
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-2 py-2.5">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </TripSheet>
  );
}
