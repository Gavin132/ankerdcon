import { useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { useUsers } from "../../hooks/useUsers";

interface TripMissingListProps {
  /** A whole sentence, e.g. "5 mensen hebben nog geen vervoer". */
  title: string;
  people: { name: string; detail?: string }[];
}

/**
 * One amber line saying who on this trip still lacks something (a ride, a
 * meal sign-up) — tap it to see the names. Renders nothing when nobody is
 * missing.
 */
export function TripMissingList({ title, people }: TripMissingListProps) {
  const { data: users = [] } = useUsers();
  const [expanded, setExpanded] = useState(false);
  if (people.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex min-h-[40px] w-full items-center gap-2 text-left text-[12.5px] font-semibold text-amber-800 dark:text-amber-300"
      >
        <AlertCircle size={14} className="shrink-0" />
        <span>{title}</span>
        <ChevronDown size={14} className={`ml-auto shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <ul className="space-y-1.5 pt-1">
          {people.map(({ name, detail }) => {
            const u = users.find((x) => x.name === name || x.discord_username === name || x.aliases?.includes(name));
            return (
              <li key={name} className="flex items-center gap-2.5 rounded-lg bg-sunken px-2.5 py-1.5">
                <UserAvatar name={u?.name ?? name} user={u} className="h-6 w-6 text-[9px] !border-0" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                  {u?.name ?? name}
                </span>
                {detail && <span className="shrink-0 text-[11px] font-medium text-ink-3">{detail}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
