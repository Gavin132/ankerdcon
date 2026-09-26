interface Props {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export function AdminPageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          Entiteiten
        </p>
        <h1 className="mt-1 font-display text-[34px] font-extrabold uppercase leading-[0.95] text-ink md:text-[42px]">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">
          {subtitle}
        </p>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
