import { Clock, EyeOff } from "lucide-react";
import { useTimeStore } from "../../store/time.store";
import { AdminPageHeader } from "./components/AdminPageHeader";

export function AdminTimeTravelPage() {
  const widgetEnabled = useTimeStore((s) => s.widgetEnabled);
  const setWidgetEnabled = useTimeStore((s) => s.setWidgetEnabled);
  const override = useTimeStore((s) => s.override);
  const setOverride = useTimeStore((s) => s.setOverride);

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto space-y-5">
      <AdminPageHeader
        title="Tijdreis-widget"
        subtitle="Het zwevende knopje waarmee je de tijd van de app kunt overschrijven om te testen"
      />

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${widgetEnabled ? "bg-sky-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
            {widgetEnabled
              ? <Clock size={16} className="text-sky-500" />
              : <EyeOff size={16} className="text-slate-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Knop tonen in de app</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Zet uit om het zwevende knopje te verbergen — geldt alleen voor jouw eigen browser.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={widgetEnabled}
          onClick={() => setWidgetEnabled(!widgetEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            widgetEnabled ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
              widgetEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {override && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Tijd staat nog overschreven</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-0.5">
              De app denkt nog steeds dat het een andere tijd is, ook met de knop verborgen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOverride(null)}
            className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors"
          >
            Terug naar echte tijd
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Deze voorkeur wordt per browser onthouden (niet gedeeld met andere admins) en verandert niets aan wat de app als &quot;nu&quot; gebruikt — dat doet alleen de knop zelf.
      </p>
    </div>
  );
}
