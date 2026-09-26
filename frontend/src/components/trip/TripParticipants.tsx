import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { TripSheet } from "./TripSheet";
import { routes } from "../../config/routes";
import { dayShort } from "../../utils/multiDay";
import type { Trip, TripPhase } from "../../utils/trips";
import type { User } from "../../types";

const findUser = (users: User[], name: string) =>
  users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));

interface TripParticipantsProps {
  trip: Trip;
  users: User[];
  /** Every name the signed-in user can appear under in `participants`. */
  myNames: string[];
  /** A trip that's over lists who *were* there. */
  phase?: TripPhase;
  /** What to show as the tap target — normally the avatar stack and "Jij en 3 anderen". */
  children: ReactNode;
}

/**
 * Wraps a row of avatars so tapping it opens the full list of who's on the
 * trip, by name. A trip can have twenty people, and a face alone doesn't say
 * who someone is — especially a profile picture you don't recognise.
 */
export function TripParticipants({ trip, users, myNames, phase, children }: TripParticipantsProps) {
  const [open, setOpen] = useState(false);
  const count = trip.participants.length;

  if (count === 0) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Bekijk wie er ${phase === "past" ? "waren" : "meegaan"} (${count})`}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left transition-opacity hover:opacity-80 active:opacity-70"
      >
        {children}
        <ChevronRight size={14} className="shrink-0 text-ink-3" aria-hidden />
      </button>
      <ParticipantsSheet open={open} onClose={() => setOpen(false)} trip={trip} users={users} myNames={myNames} phase={phase} />
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
}: Omit<TripParticipantsProps, "children"> & { open: boolean; onClose: () => void }) {
  const isMine = (name: string) => myNames.includes(name);
  const multiDay = trip.days.length > 1;

  const people = [...trip.participants]
    .map((name) => {
      const user = findUser(users, name);
      const days = trip.days.filter((d) => (d.ev.participants ?? []).includes(name));
      return { name, user, days, display: user?.name ?? name };
    })
    .sort((a, b) => Number(isMine(b.name)) - Number(isMine(a.name)) || a.display.localeCompare(b.display, "nl"));

  const daysText = (days: typeof people[number]["days"]) =>
    days.length === trip.days.length ? "Alle dagen" : days.map((d) => `${dayShort(d.date)} ${d.date.getDate()}`).join(" · ");

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title={phase === "past" ? "Wie waren er" : "Wie gaan er mee"}
      subtitle={`${trip.title} · ${people.length} ${people.length === 1 ? "persoon" : "personen"}`}
    >
      {people.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
            <Users size={22} />
          </span>
          <p className="text-sm font-semibold text-ink">Nog niemand aangemeld</p>
        </div>
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {people.map(({ name, user, days, display }) => {
            const row = (
              <>
                <UserAvatar name={display} user={user} className="h-10 w-10 shrink-0 text-sm" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-semibold text-ink">{display}</span>
                    {isMine(name) && (
                      <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-semibold text-brand-text">Jij</span>
                    )}
                  </span>
                  {multiDay && <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-3">{daysText(days)}</span>}
                </span>
              </>
            );
            return (
              <li key={name}>
                {user?.id ? (
                  <Link
                    to={routes.profile.view(user.id)}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-sunken active:bg-sunken"
                  >
                    {row}
                    <ChevronRight size={14} className="shrink-0 text-ink-3" />
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
