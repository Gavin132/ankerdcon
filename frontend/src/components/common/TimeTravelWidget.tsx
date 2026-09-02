import { useState } from "react";
import { Clock, RotateCcw } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useTimeStore } from "../../store/time.store";
import { useCurrentUser } from "../../hooks/useUsers";

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
 * Admin-only floating dev tool that lets you freeze the app's notion of
 * "now" to a chosen moment, so time-dependent behaviour (quick-ride
 * direction guessing, ride/event day grouping, past-item filtering) can be
 * tested without waiting for the real clock. Only affects the frontend —
 * the backend's scheduled Discord reminders still run on the real server
 * clock and are unaffected by this override.
 */
export function TimeTravelWidget() {
  const { data: me } = useCurrentUser();
  const override = useTimeStore((s) => s.override);
  const setOverride = useTimeStore((s) => s.setOverride);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toLocalInputValue(override ?? new Date()));

  if (!me?.is_admin) return null;

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
      <button
        type="button"
        onClick={openPanel}
        aria-label="Tijdreizen (testtool)"
        className={`fixed right-4 z-40 flex h-11 items-center gap-2 rounded-full px-4 text-xs font-bold shadow-lg transition-colors ${
          override
            ? "bg-amber-500 text-white shadow-amber-500/30"
            : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        }`}
        style={{ bottom: "max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem))" }}
      >
        <Clock size={15} />
        {override ? formatOverride(override) : "Tijd"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tijdreizen"
        description="Alleen voor testen — verandert wat de app als 'nu' ziet, niet de echte tijd."
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
              Huidig
            </p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {override ? `${formatOverride(override)} (overschreven)` : "Live — echte tijd"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
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
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              Snel verspringen
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => nudge(60 * 60_000)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                +1 uur
              </button>
              <button
                type="button"
                onClick={() => nudge(24 * 60 * 60_000)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                +1 dag
              </button>
              <button
                type="button"
                onClick={() => nudge(7 * 24 * 60 * 60_000)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                +1 week
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setOverride(null); setOpen(false); }}
            disabled={!override}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={14} />
            Terug naar echte tijd
          </button>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Werkt alleen in de app zelf. Geplande Discord-herinneringen draaien op de server en gebruiken nog steeds de echte tijd.
          </p>
        </div>
      </Modal>
    </>
  );
}
