import { useState, useSyncExternalStore } from "react";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { Button } from "./Button";
import {
  dismissInstallHint,
  installHintDismissed,
  installKind,
  promptInstall,
  subscribeInstall,
  type InstallKind,
} from "../../utils/install";

/** How this phone can install the app, or null when it cannot (or already has). Re-read when the browser
 * offers the install dialog, which can be after the page first rendered. */
export function useInstallKind(): InstallKind | null {
  return useSyncExternalStore(subscribeInstall, installKind, () => null);
}

/** Whether the Hub should offer the card now: possible, and not waved away in the last 30 days. */
export function useShowInstallHint() {
  const kind = useInstallKind();
  const [dismissed, setDismissed] = useState(() => installHintDismissed());
  return {
    kind,
    visible: kind !== null && !dismissed,
    dismiss: () => {
      dismissInstallHint();
      setDismissed(true);
    },
  };
}

/**
 * "Zet Ankerd Con op je beginscherm": one tap where the browser allows it, the Share-menu steps on iPhone.
 * `onDismiss` adds a "Later" button (the Hub card); in Instellingen it is always there and has none.
 */
export function InstallHint({ kind, onDismiss }: { kind: InstallKind; onDismiss?: () => void }) {
  const [busy, setBusy] = useState(false);

  async function install() {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface p-4" aria-label="App installeren">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
          <Download size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">Zet Ankerd Con op je beginscherm</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-3">
            Opent sneller, zonder de browserbalken
            {kind === "ios" ? " en alleen zo kun je meldingen krijgen op een iPhone." : ", en je krijgt meldingen als je ze aanzet."}
          </p>
          {kind === "ios" ? (
            <ol className="mt-3 space-y-2 text-[13px] text-ink-2">
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken font-mono text-[12px] font-semibold text-ink">1</span>
                <span>
                  Tik op <Share size={14} className="mx-0.5 inline -translate-y-px" aria-label="Delen" /> onderin Safari
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken font-mono text-[12px] font-semibold text-ink">2</span>
                <span>
                  Kies <PlusSquare size={14} className="mx-0.5 inline -translate-y-px" aria-hidden /> <b className="font-semibold">Zet op beginscherm</b>
                </span>
              </li>
            </ol>
          ) : (
            <Button size="sm" onClick={install} loading={busy} className="mt-3">
              Installeren
            </Button>
          )}
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Sluiten" className="icon-btn -mr-1 -mt-1">
            <X size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
