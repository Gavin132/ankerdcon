import { useState } from "react";
import { Clock, RotateCcw } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useTimeStore } from "../../store/time.store";
import { useCurrentUser } from "../../hooks/useUsers";
import { useAuthStore } from "../../store/auth.store";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatOverride(d: Date): string {
  return d.toLocaleString("nl-NL", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Admin-only dev tool that lets you freeze the app's notion of "now" to a
 * chosen moment, so time-dependent behaviour (quick-ride direction guessing,
 * ride/event day grouping, past-item filtering) can be tested without waiting
 * for the real clock. Only affects the frontend — the backend's scheduled
 * Discord reminders still run on the real server clock.
 *
 * Lives in the app chrome instead of floating over content: `sidebar` is a row
 * at the bottom of the desktop sidebar (icon only on the tablet rail), `icon`
 * a top-bar button. Both turn amber while a time override is active. Renders
 * nothing unless the widget is switched on (Admin › Tijdreis-widget) and the
 * user is an admin.
 */
export function TimeTravelControl({ variant }: { variant: "sidebar" | "icon" }) {
  const { data: me } = useCurrentUser();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const widgetEnabled = useTimeStore((s) => s.widgetEnabled);
  const override = useTimeStore((s) => s.override);
  const setOverride = useTimeStore((s) => s.setOverride);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toLocalInputValue(override ?? new Date()));

  if (!isAuthenticated || !widgetEnabled || !me?.is_admin) return null;

  function openPanel() {
    setDraft(toLocalInputValue(override ?? new Date()));
    setOpen(true);
  }

  function apply(d: Date) {
    setOverride(d);
    setDraft(toLocalInputValue(d));
  }

  function nudge(ms: number) {
    apply(new Date((override ?? new Date()).getTime() + ms));
  }

  function applyDraft() {
    const d = new Date(draft);
    if (!isNaN(d.getTime())) apply(d);
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={openPanel}
          title="Tijdreizen (testtool)"
          aria-label="Tijdreizen (testtool)"
          className={`flex w-full items-center justify-center gap-2.5 rounded-lg p-2.5 text-left transition-colors lg:justify-start lg:px-2.5 lg:py-2 ${
            override
              ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25"
              : "text-ink-2 hover:bg-sunken hover:text-ink"
          }`}
        >
          <Clock size={19} className="shrink-0 lg:h-4 lg:w-4" />
          <span className="hidden min-w-0 flex-1 lg:block">
            <span className="block text-[14px] font-medium leading-tight">Tijdreizen</span>
            <span className="block truncate font-mono text-[10.5px] leading-tight opacity-80">
              {override ? formatOverride(override) : "Echte tijd"}
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={openPanel}
          title={override ? `Tijdreizen: ${formatOverride(override)}` : "Tijdreizen (testtool)"}
          aria-label="Tijdreizen (testtool)"
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            override
              ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
              : "text-ink-2 hover:bg-sunken hover:text-ink"
          }`}
        >
          <Clock size={17} />
          {override && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-1.5 border-surface bg-amber-500" />
          )}
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tijdreizen"
        description="Alleen voor testen — verandert wat de app als 'nu' ziet, niet de echte tijd."
      >
        <div className="space-y-5">
          <div className="rounded-xl border-1.5 border-line bg-sunken p-4">
            <p className="section-label mb-1">
              Huidig
            </p>
            <p className="font-mono text-sm font-semibold text-ink">
              {override ? `${formatOverride(override)} (overschreven)` : "Live — echte tijd"}
            </p>
          </div>

          <div>
            <label className="section-label mb-1.5 block">
              Nieuwe tijd
            </label>
            <input
              type="datetime-local"
              className="input-field"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button onClick={applyDraft} className="w-full mt-2">
              Instellen
            </Button>
          </div>

          <div>
            <p className="section-label mb-1.5">
              Snel verspringen
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => nudge(60 * 60_000)}
                className="rounded-xl border-1.5 border-line bg-surface py-2 font-mono text-xs font-semibold text-ink-2 hover:border-ink-3 hover:text-ink transition-colors"
              >
                +1 uur
              </button>
              <button
                type="button"
                onClick={() => nudge(24 * 60 * 60_000)}
                className="rounded-xl border-1.5 border-line bg-surface py-2 font-mono text-xs font-semibold text-ink-2 hover:border-ink-3 hover:text-ink transition-colors"
              >
                +1 dag
              </button>
              <button
                type="button"
                onClick={() => nudge(7 * 24 * 60 * 60_000)}
                className="rounded-xl border-1.5 border-line bg-surface py-2 font-mono text-xs font-semibold text-ink-2 hover:border-ink-3 hover:text-ink transition-colors"
              >
                +1 week
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setOverride(null); setOpen(false); }}
            disabled={!override}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-1.5 border-line bg-surface py-2.5 text-sm font-semibold text-ink-2 hover:border-ink-3 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={14} />
            Terug naar echte tijd
          </button>

          <p className="text-xs leading-relaxed text-ink-3">
            Werkt alleen in de app zelf. Geplande Discord-herinneringen draaien op de server en gebruiken nog steeds de echte tijd.
          </p>
        </div>
      </Modal>
    </>
  );
}
