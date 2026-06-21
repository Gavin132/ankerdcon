import { EmptyStateProps } from "../../types/interfaces";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-50 to-sky-100 text-sky-300 shadow-inner dark:from-sky-900/30 dark:to-sky-800/20 dark:text-sky-500">
        {icon}
      </div>
      <h3 className="mb-1.5 text-base font-black text-slate-800">{title}</h3>
      {description && (
        <p className="mb-5 max-w-[220px] text-sm text-slate-400 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
