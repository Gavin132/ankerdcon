import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { TripSheet } from "../trip/TripSheet";
import { Button } from "../common/Button";
import { useSubmitFeedback } from "../../hooks/useFeedback";
import { toast } from "../../store/toast.store";
import type { FeedbackKind } from "../../types";

export const FEEDBACK_KINDS: { id: FeedbackKind; label: string; hint: string }[] = [
  { id: "bug", label: "Bug", hint: "Er werkt iets niet zoals het hoort. Wat deed je, en wat gebeurde er?" },
  { id: "idea", label: "Idee", hint: "Iets wat de app beter of leuker zou maken." },
  { id: "other", label: "Anders", hint: "Een vraag, compliment of iets anders." },
];

const MIN = 5;
const MAX = 2000;

/** Settings › Feedback geven: a bug, idea or remark for the admins, optionally without your name. */
export function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const submit = useSubmitFeedback();

  // A draft survives a failed send and a closed sheet; only a sent message clears it.
  useEffect(() => {
    if (open) submit.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmed = message.trim();
  const canSend = trimmed.length >= MIN && trimmed.length <= MAX;
  const hint = FEEDBACK_KINDS.find((k) => k.id === kind)?.hint;

  async function send() {
    if (!canSend) return;
    try {
      await submit.mutateAsync({ kind, message: trimmed, anonymous });
      toast("success", "Bedankt voor je feedback!");
      setMessage("");
      setKind("bug");
      setAnonymous(false);
      onClose();
    } catch (e) {
      toast("error", e instanceof Error && e.message ? e.message : "Versturen is niet gelukt. Probeer het opnieuw.");
    }
  }

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      title="Feedback geven"
      subtitle="Een bug, idee of iets anders"
      footer={
        <Button onClick={send} loading={submit.isPending} disabled={!canSend} className="w-full">
          <Send size={15} />
          Versturen
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="section-label mb-2">Waar gaat het over?</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Soort feedback">
            {FEEDBACK_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                aria-pressed={kind === k.id}
                className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                  kind === k.id ? "border-2 border-outline bg-brand text-brand-on" : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="feedback-message" className="section-label mb-2 block">Je bericht</label>
          <textarea
            id="feedback-message"
            className="input-field resize-none"
            rows={6}
            maxLength={MAX}
            placeholder={hint}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="mt-1 text-right font-mono text-[11px] tabular-nums text-ink-3">{trimmed.length} / {MAX}</p>
        </div>

        <label htmlFor="feedback-anonymous" className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-2">
          <input
            id="feedback-anonymous"
            type="checkbox"
            className="cb mt-0.5"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
          />
          <span>
            <span className="font-semibold text-ink">Anoniem versturen</span>
            <span className="block text-[12.5px] text-ink-3">
              Zonder je naam: de beheerders zien niet van wie het komt, dus je krijgt ook geen reactie.
            </span>
          </span>
        </label>
      </div>
    </TripSheet>
  );
}
