import { FEATURES } from "./constants";

export function StepFeatures() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-ink">Wat kun je doen?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Een korte rondleiding door de app.
        </p>
      </div>

      <div className="card-surface divide-y divide-line overflow-hidden">
        {FEATURES.map(({ icon: Icon, color, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3.5 p-4"
          >
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
