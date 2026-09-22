import { useState } from "react";
import { AlertTriangle, ChevronRight, FileQuestion, ShieldX, WifiOff, X, Bomb, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminPageHeader } from "./components/AdminPageHeader";
import { ErrorFallback } from "../../components/common/ErrorBoundary";
import { ServerUnreachable } from "../../components/common/ServerUnreachable";
import { ForbiddenPage } from "../ForbiddenPage";
import { NotFoundPage } from "../NotFoundPage";
import { routes } from "../../config/routes";

type ScreenKey = "crash" | "unreachable" | "forbidden" | "notFound" | "uploadQueued";

const SCREENS: { key: ScreenKey; label: string; when: string; icon: typeof WifiOff }[] = [
  { key: "crash", label: "Er ging iets mis", when: "De app crasht tijdens het renderen, en de automatische herlaad hielp niet.", icon: AlertTriangle },
  { key: "unreachable", label: "Kan de server niet bereiken", when: "Je bent ingelogd, maar je profiel kan niet worden geladen (backend offline, 5xx, geen bereik).", icon: WifiOff },
  { key: "forbidden", label: "Geen toegang", when: "Je Discord-account staat niet op de whitelist.", icon: ShieldX },
  { key: "notFound", label: "404 — pagina niet gevonden", when: "Een link naar een pagina die niet (meer) bestaat.", icon: FileQuestion },
  { key: "uploadQueued", label: "Upload wacht op verbinding", when: "Een story- of cosplayfoto kon niet weg door een slechte verbinding, en wordt automatisch opnieuw geprobeerd.", icon: UploadCloud },
];

/** A static look-alike of the amber "queued" state — story photos and
 * cosplay images both use this look, so one preview covers both. Not wired
 * to any real upload; just the visual, since actually going offline to
 * trigger it isn't practical from an admin's desk. */
function UploadQueuedPreview() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-paper px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          <UploadCloud size={22} />
        </span>
        <p className="max-w-[280px] text-sm text-ink-2">
          Zo ziet een foto eruit die niet weg kon door een slechte verbinding, in de story- en cosplay-uploads.
        </p>
      </div>

      <div className="flex w-full max-w-xs items-center gap-2 rounded-xl border-1.5 border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
        <UploadCloud size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="truncate text-xs font-medium text-amber-700 dark:text-amber-400">Wacht op verbinding…</span>
      </div>

      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink-2">
        <UploadCloud size={16} className="text-amber-600 dark:text-amber-400" />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold text-white">1</span>
      </div>
    </div>
  );
}

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
          {open === "uploadQueued" && <UploadQueuedPreview />}
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
