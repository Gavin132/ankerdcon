import { ActionAlert } from "../../types";
import { formatDate } from "../../utils/format";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { MissingChip } from "./MissingChip";
import { UserAvatar } from "../common/UserAvatar";
import { useUsers } from "../../hooks/useUsers";

export function EventAlertBlock({ alert }: { alert: ActionAlert }) {
  const { data: users = [] } = useUsers();

  return (
    <CollapsibleSection
      defaultOpen={false}
      className="border-b border-slate-100 dark:border-slate-700/60 last:border-0"
      titleClassName="py-2.5 px-4"
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
            {alert.eventName}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            {formatDate(alert.date)}
          </span>
          <span className="ml-auto mr-2 shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            {alert.missing.length}
          </span>
        </div>
      }
    >
      <div className="space-y-2 px-4 pb-3">
        {alert.missing.map(({ name, items }) => {
          const resolved = users.find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name));
          const displayName = resolved?.name ?? name;
          return (
            <div key={name} className="flex items-center gap-2.5">
              <UserAvatar name={name} className="h-7 w-7 shrink-0 text-xs rounded-lg" />
              <span className="w-20 shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-200 truncate capitalize">
                {displayName}
              </span>
              <div className="flex flex-wrap gap-1">
                {items.map((i) => (
                  <MissingChip key={i} label={i} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
