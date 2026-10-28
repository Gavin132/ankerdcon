interface Props {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  /** The sidebar group the page sits in. */
  eyebrow?: "Beheer" | "Entiteiten" | "Testen";
}

export function AdminPageHeader({ title, subtitle, action, eyebrow = "Entiteiten" }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-3">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-display text-[34px] font-extrabold uppercase leading-[0.95] text-ink md:text-[42px]">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">
          {subtitle}
        </p>
      </div>
      {action && (
        // On a phone the buttons share the full width, two to a row, instead of hugging the left edge.
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 max-sm:[&>*]:flex-1 sm:w-auto">{action}</div>
      )}
    </div>
  );
}
