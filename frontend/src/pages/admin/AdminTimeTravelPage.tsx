import { Clock, EyeOff } from "lucide-react";
import { useTimeStore } from "../../store/time.store";
import { AdminPageHeader } from "./components/AdminPageHeader";

export function AdminTimeTravelPage() {
  const widgetEnabled = useTimeStore((s) => s.widgetEnabled);
  const setWidgetEnabled = useTimeStore((s) => s.setWidgetEnabled);
  const override = useTimeStore((s) => s.override);
  const setOverride = useTimeStore((s) => s.setOverride);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Tijdreis-widget"
        subtitle="Het zwevende knopje waarmee je de tijd van de app kunt overschrijven om te testen"
      />

      <div className="card-surface flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken">
            {widgetEnabled
              ? <Clock size={16} className="text-ink" />
              : <EyeOff size={16} className="text-ink-3" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Knop tonen in de app</p>
            <p className="text-xs text-ink-3 mt-0.5">
              Zet uit om het zwevende knopje te verbergen — geldt alleen voor jouw eigen browser.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={widgetEnabled}
          onClick={() => setWidgetEnabled(!widgetEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-text ${
            widgetEnabled ? "bg-ink dark:bg-brand" : "bg-line"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full transition-transform duration-200 ${
              widgetEnabled ? "translate-x-5 bg-paper" : "translate-x-0 bg-white dark:bg-ink-3"
            }`}
          />
        </button>
      </div>

      {override && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-1.5 border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Tijd staat nog overschreven</p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
              De app denkt nog steeds dat het een andere tijd is, ook met de knop verborgen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOverride(null)}
            className="shrink-0 rounded-lg border-1.5 border-amber-300 bg-surface px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:border-amber-500 dark:border-amber-500/40 dark:text-amber-300"
          >
            Terug naar echte tijd
          </button>
        </div>
      )}

      <p className="text-xs text-ink-3">
        Deze voorkeur wordt per browser onthouden (niet gedeeld met andere admins) en verandert niets aan wat de app als &quot;nu&quot; gebruikt — dat doet alleen de knop zelf.
      </p>
    </div>
  );
}
