interface Props {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export function AdminPageHeader({ title, subtitle, action }: Props) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
        Entiteiten
      </p>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}
