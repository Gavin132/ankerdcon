import { useState } from "react";
import { Check, MessageSquarePlus, Send } from "lucide-react";
import { submitFeedback } from "../../services/feedback.service";

const MIN = 5;
/** The message may be 2000 characters; the rest is room for what we add ourselves. */
const MAX_TYPED = 1500;

/**
 * "Vertel wat er gebeurde", on the crash screen: the moment something broke is the
 * best moment to report it, and the member has just seen it. It sends a normal bug report
 * with the technical message and the page appended, so whoever reads it in Admin → Feedback
 * does not have to ask for either.
 *
 * Deliberately independent of React Query and the router: the crash screen is also shown when
 * the whole app has been replaced, where neither exists.
 */
export function CrashFeedback({ detail }: { detail: string | null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const trimmed = text.trim();
  const canSend = trimmed.length >= MIN && state !== "sending";

  async function send() {
    if (!canSend) return;
    setState("sending");
    const technical = [`Pagina: ${window.location.pathname}`, detail ? `Fout: ${detail}` : null].filter(Boolean).join("\n");
    try {
      await submitFeedback({ kind: "bug", message: `${trimmed}\n\n[Foutscherm]\n${technical}`, anonymous: false });
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <p className="mt-5 flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300" role="status">
        <Check size={14} /> Bedankt, we kijken ernaar.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-text hover:underline"
      >
        <MessageSquarePlus size={13} />
        Vertel wat er gebeurde
      </button>
    );
  }

  return (
    <div className="mt-5 w-full max-w-[320px] space-y-2 text-left">
      <label htmlFor="crash-feedback" className="section-label block">Wat deed je toen het misging?</label>
      <textarea
        id="crash-feedback"
        rows={3}
        maxLength={MAX_TYPED}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input-field resize-none select-text"
        placeholder="Bijv. ik tikte op Vervoer en kreeg dit scherm"
      />
      <p className="text-[11.5px] leading-snug text-ink-3">De pagina en de technische melding gaan automatisch mee.</p>
      {state === "failed" && (
        <p className="text-[12px] font-semibold text-rose-700 dark:text-rose-300" role="alert">
          Versturen lukte niet. Probeer het later nog eens, via Instellingen → Feedback geven.
        </p>
      )}
      <button
        type="button"
        onClick={send}
        disabled={!canSend}
        className="btn-primary h-10 w-full gap-2 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={14} />
        {state === "sending" ? "Versturen…" : "Versturen"}
      </button>
    </div>
  );
}
