import { EmptyStateProps } from "../../types/interfaces";

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-8" : "py-16"}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sunken text-ink-3">
        {icon}
      </div>
      <h3 className="mb-1 text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mb-5 max-w-[240px] text-xs text-ink-3 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
