import { Clock } from "lucide-react";
import { useTimeStore } from "../../store/time.store";
import { AdminPage } from "./components/AdminPage";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { ToggleRow } from "./components/ToggleRow";

export function AdminTimeTravelPage() {
  const widgetEnabled = useTimeStore((s) => s.widgetEnabled);
  const setWidgetEnabled = useTimeStore((s) => s.setWidgetEnabled);
  const override = useTimeStore((s) => s.override);
  const setOverride = useTimeStore((s) => s.setOverride);

  return (
    <AdminPage width="narrow">
      <AdminPageHeader
        eyebrow="Testen"
        title="Tijdreis"
        subtitle="Zet de tijd van de app om iets te testen"
      />

      <ToggleRow
        icon={<Clock size={16} />}
        label="Tijdreis-knop tonen"
        hint="Zet uit om het klokje in de balk te verbergen. Geldt alleen voor deze browser."
        checked={widgetEnabled}
        onChange={() => setWidgetEnabled(!widgetEnabled)}
      />

      {override && (
        <div className="notice-warn flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-warn">Tijd staat nog overschreven</p>
            <p className="mt-0.5 text-sm text-ink-2">
              De app denkt nog steeds dat het een andere tijd is, ook met het klokje verborgen.
            </p>
          </div>
          <button type="button" onClick={() => setOverride(null)} className="btn-secondary shrink-0 px-4 text-sm">
            Terug naar echte tijd
          </button>
        </div>
      )}

      <p className="text-sm text-ink-3">
        Deze voorkeur wordt per browser onthouden (niet gedeeld met andere admins). Wat de app als &quot;nu&quot;
        gebruikt verandert alleen met het klokje zelf.
      </p>
    </AdminPage>
  );
}
