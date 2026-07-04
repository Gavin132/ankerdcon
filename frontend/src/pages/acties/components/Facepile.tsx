import { UserAvatar } from "../../../components/common/UserAvatar";
import { resolveUser } from "../helpers";
import type { User } from "../../../types";

export function Facepile({
  names,
  users,
  max = 5,
}: {
  names: string[];
  users: User[];
  max?: number;
}) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((n) => {
        const u = resolveUser(n, users);
        return (
          <UserAvatar
            key={n}
            name={u?.name ?? n}
            user={u}
            className="h-5 w-5 text-[7px] ring-[1.5px] ring-white dark:ring-slate-900"
          />
        );
      })}
      {extra > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 ring-[1.5px] ring-white dark:ring-slate-900 text-[8px] font-black text-slate-600 dark:text-slate-300">
          +{extra}
        </div>
      )}
    </div>
  );
}
