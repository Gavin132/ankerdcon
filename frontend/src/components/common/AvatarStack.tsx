import { useUsers } from "../../hooks/useUsers";
import { groupPeople } from "../../utils/people";
import { UserAvatar } from "./UserAvatar";

const SIZES = {
  xs: "h-5 w-5 text-[8px] !border-[1.5px]",
  sm: "h-6 w-6 text-[9px]",
  md: "h-7 w-7 text-[12px]",
} as const;

const OVERLAP = { xs: "-space-x-1", sm: "-space-x-1.5", md: "-space-x-1.5" } as const;

interface AvatarStackProps {
  /** The stored names of a list (participants, occupants): one person under two names shows once. */
  names: string[];
  /** How many faces before "+N". */
  max?: number;
  size?: keyof typeof SIZES;
  /** The ring around each face, to match the background it sits on (default: the card surface). */
  ringClass?: string;
  /** On the always-dark hero block: the ring takes the hero colour and the "+N" is a light tint. */
  onDark?: boolean;
  className?: string;
}

/** Overlapping faces of the people on a list, with a "+N" for the rest. Counts people, not stored names. */
export function AvatarStack({ names, max = 5, size = "md", ringClass, onDark = false, className = "" }: AvatarStackProps) {
  const { data: users = [] } = useUsers();
  ringClass ??= onDark ? "!border-hero" : "!border-surface";
  const people = groupPeople(names, users);
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={`flex shrink-0 ${OVERLAP[size]} ${className}`}>
      {shown.map((p) => (
        <UserAvatar key={p.names[0]} name={p.name} user={p.user} className={`${SIZES[size]} ${ringClass}`} />
      ))}
      {rest > 0 && (
        <span
          className={`flex shrink-0 items-center justify-center rounded-full border-2 border-surface font-semibold ${onDark ? "bg-hero-ink/15 text-hero-ink" : "bg-sunken text-ink-2"} ${SIZES[size]} ${ringClass}`}
          aria-label={`nog ${rest}`}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
