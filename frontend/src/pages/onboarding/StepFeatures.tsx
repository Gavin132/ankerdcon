import { FEATURES } from "./constants";

export function StepFeatures() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Wat kun je doen?</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Een korte rondleiding door de app.
        </p>
      </div>

      <div className="space-y-3">
        {FEATURES.map(({ icon: Icon, color, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
          >
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
