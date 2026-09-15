import { useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { useUsers } from "../../hooks/useUsers";

interface TripMissingListProps {
  title: string;
  people: { name: string; detail?: string }[];
}

const COLLAPSED_COUNT = 4;

/**
 * Amber note listing who on this trip still lacks something (a ride, a meal
 * sign-up), shown on the tab where it gets fixed. Renders nothing when
 * nobody is missing.
 */
export function TripMissingList({ title, people }: TripMissingListProps) {
  const { data: users = [] } = useUsers();
  const [expanded, setExpanded] = useState(false);
  if (people.length === 0) return null;

  const shown = expanded ? people : people.slice(0, COLLAPSED_COUNT);
  const hidden = people.length - shown.length;

  return (
    <div className="rounded-xl border-1.5 border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-500/25 dark:bg-amber-500/10">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <AlertCircle size={15} className="shrink-0 text-amber-700 dark:text-amber-300" />
        {title}
        <span className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-[0.05em] tabular-nums text-amber-800/75 dark:text-amber-300/75">
          {people.length} {people.length === 1 ? "persoon" : "personen"}
        </span>
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {shown.map(({ name, detail }) => {
          const u = users.find((x) => x.name === name || x.discord_username === name || x.aliases?.includes(name));
          return (
            <li key={name} className="flex items-center gap-2.5 rounded-lg bg-surface px-2.5 py-1.5">
              <UserAvatar name={u?.name ?? name} user={u} className="h-6 w-6 text-[9px] !border-0" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                {u?.name ?? name}
              </span>
              {detail && <span className="shrink-0 text-[11px] font-medium text-ink-3">{detail}</span>}
            </li>
          );
        })}
      </ul>
      {(hidden > 0 || expanded) && people.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline dark:text-amber-300"
        >
          <ChevronDown size={13} className={expanded ? "rotate-180" : ""} />
          {expanded ? "Minder tonen" : `Nog ${hidden} tonen`}
        </button>
      )}
    </div>
  );
}
