import { useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { useUsers } from "../../hooks/useUsers";

interface TripMissingListProps {
  title: string;
  people: { name: string; detail?: string }[];
}

/**
 * Collapsed amber summary of who on this trip still lacks something (a
 * ride, a meal sign-up) — starts as a single line so it doesn't dominate
 * the tab; tap it to see names. Renders nothing when nobody is missing.
 */
export function TripMissingList({ title, people }: TripMissingListProps) {
  const { data: users = [] } = useUsers();
  const [expanded, setExpanded] = useState(false);
  if (people.length === 0) return null;

  return (
    <div className="rounded-xl border-1.5 border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-left"
      >
        <AlertCircle size={15} className="shrink-0 text-amber-700 dark:text-amber-300" />
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">{title}</span>
        <span className="ml-auto font-mono text-[11px] font-semibold uppercase tracking-[0.05em] tabular-nums text-amber-800/75 dark:text-amber-300/75">
          {people.length} {people.length === 1 ? "persoon" : "personen"}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-amber-700 dark:text-amber-300 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <ul className="space-y-1.5 px-4 pb-3.5">
          {people.map(({ name, detail }) => {
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
      )}
    </div>
  );
}
