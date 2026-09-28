import { BellOff, BellRing, Download, ShieldOff } from "lucide-react";
import { usePush } from "../../hooks/usePush";
import { toast } from "../../store/toast.store";

/**
 * "Pushmeldingen op dit apparaat" — a live toggle reflecting the browser's
 * actual Push API subscription (see hooks/usePush.ts), not a saved
 * preference, so it's always right regardless of what happened outside the
 * app (permission revoked, a reinstall, a different device). Renders nothing
 * when the browser has no Push API at all — a hidden row beats one that's
 * visible but does nothing.
 */
export function PushToggle() {
  const { state, busy, enable, disable } = usePush();

  if (state === "loading" || state === "unsupported") return null;

  async function onToggle() {
    try {
      if (state === "on") await disable();
      else await enable();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Pushmeldingen instellen is niet gelukt.");
    }
  }

  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              state === "on" ? "bg-brand-soft text-brand-text" : "bg-sunken text-ink-3"
            }`}
          >
            {state === "denied" ? <ShieldOff size={16} /> : state === "on" ? <BellRing size={16} /> : <BellOff size={16} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Pushmeldingen</p>
            <p className="mt-0.5 text-xs text-ink-2">
              {state === "needs-install" && "Voeg de app toe aan je beginscherm om dit te kunnen aanzetten."}
              {state === "denied" && "Geblokkeerd in je browser- of telefooninstellingen voor deze site."}
              {(state === "on" || state === "off") && "Meldingen op dit apparaat, ook als de app niet open staat."}
            </p>
          </div>
        </div>
        {(state === "on" || state === "off") && (
          <button
            type="button"
            role="switch"
            aria-checked={state === "on"}
            aria-label="Pushmeldingen"
            disabled={busy}
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 ${
              state === "on" ? "bg-brand-text" : "bg-line"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                state === "on" ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        )}
        {state === "needs-install" && <Download size={16} className="shrink-0 text-ink-3" />}
      </div>
    </div>
  );
}
