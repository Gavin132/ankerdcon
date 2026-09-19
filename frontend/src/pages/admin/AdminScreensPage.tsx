import { useState } from "react";
import { AlertTriangle, ChevronRight, FileQuestion, ShieldX, WifiOff, X, Bomb } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { ErrorFallback } from "../../components/common/ErrorBoundary";
import { ServerUnreachable } from "../../components/common/ServerUnreachable";
import { ForbiddenPage } from "../ForbiddenPage";
import { NotFoundPage } from "../NotFoundPage";
import { routes } from "../../config/routes";

type ScreenKey = "crash" | "unreachable" | "forbidden" | "notFound";

const SCREENS: { key: ScreenKey; label: string; when: string; icon: typeof WifiOff }[] = [
  { key: "crash", label: "Er ging iets mis", when: "De app crasht tijdens het renderen, en de automatische herlaad hielp niet.", icon: AlertTriangle },
  { key: "unreachable", label: "Kan de server niet bereiken", when: "Je bent ingelogd, maar je profiel kan niet worden geladen (backend offline, 5xx, geen bereik).", icon: WifiOff },
  { key: "forbidden", label: "Geen toegang", when: "Je Discord-account staat niet op de whitelist.", icon: ShieldX },
  { key: "notFound", label: "404 — pagina niet gevonden", when: "Een link naar een pagina die niet (meer) bestaat.", icon: FileQuestion },
];

/** Shows each full-screen state exactly as users see it, without breaking anything. */
export function AdminScreensPage() {
  const [open, setOpen] = useState<ScreenKey | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <AdminPageHeader
        title="Schermen testen"
        subtitle="Bekijk de schermen die gebruikers zien als er iets misgaat. Knoppen in de preview doen niets echts."
      />

      <div className="space-y-2">
        {SCREENS.map(({ key, label, when, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setOpen(key)}
            className="card-surface flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-ink-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-2">
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{label}</span>
              <span className="mt-0.5 block text-xs text-ink-3">{when}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-ink-3" />
          </button>
        ))}

        <Link
          to={routes.testError}
          className="card-surface flex w-full items-center gap-3 p-4 transition-colors hover:border-ink-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-2">
            <Bomb size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Echte crash veroorzaken</span>
            <span className="mt-0.5 block text-xs text-ink-3">
              Laat de pagina echt crashen: eerst één automatische herlaad, daarna het crashscherm.
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-ink-3" />
        </Link>
      </div>

      {open && (
        <div className="fixed inset-0 z-[400] overflow-y-auto bg-paper">
          {open === "crash" && <ErrorFallback />}
          {open === "unreachable" && <ServerUnreachable onRetry={() => {}} />}
          {open === "forbidden" && <ForbiddenPage onSignOut={() => setOpen(null)} />}
          {open === "notFound" && <NotFoundPage />}
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Preview sluiten"
            className="fixed right-4 top-4 z-[410] flex h-10 w-10 items-center justify-center rounded-full border-1.5 border-line bg-surface text-ink shadow-sm"
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
