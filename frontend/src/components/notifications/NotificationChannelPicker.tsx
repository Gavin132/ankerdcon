import type { ReactNode } from "react";
import { Bell, Check, Download, ShieldOff } from "lucide-react";
import { usePush } from "../../hooks/usePush";
import { toast } from "../../store/toast.store";
import { DiscordIcon } from "../common/DiscordIcon";

interface NotificationChannelPickerProps {
  /** The stored, account-wide "Discord DM's toestaan" preference — the caller
   * persists it (draft/save on the settings page, onboarding state elsewhere). */
  allowDm: boolean;
  onAllowDmChange: (value: boolean) => void;
  /** Whether this profile has a linked Discord account at all. */
  hasDiscord: boolean;
}

/**
 * The single "how do you want to hear from us" choice: Discord DM's or
 * pushmeldingen op dit apparaat, never both — picking one turns the other
 * off here. Push's on/off state is the live browser subscription (see
 * usePush), scoped to this device; allowDm is the stored, account-wide
 * Discord preference. An option that isn't usable right now (no Discord
 * linked, push unsupported) is left out rather than shown disabled.
 */
export function NotificationChannelPicker({ allowDm, onAllowDmChange, hasDiscord }: NotificationChannelPickerProps) {
  const { state: pushState, busy: pushBusy, enable, disable } = usePush();

  if (pushState === "loading") return null;

  const pushOn = pushState === "on";
  const pushShown = pushState !== "unsupported";
  const pushClickable = pushState === "on" || pushState === "off";
  const selected: "discord" | "push" | null = pushOn ? "push" : hasDiscord && allowDm ? "discord" : null;

  async function selectDiscord() {
    onAllowDmChange(true);
    if (pushOn) {
      try {
        await disable();
      } catch (e) {
        toast("error", e instanceof Error ? e.message : "Pushmeldingen uitzetten is niet gelukt.");
      }
    }
  }

  async function selectPush() {
    if (pushOn) return;
    try {
      await enable();
      onAllowDmChange(false);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Pushmeldingen instellen is niet gelukt.");
    }
  }

  if (!hasDiscord && !pushShown) {
    return (
      <div className="card-surface p-4 text-[12.5px] leading-relaxed text-ink-3">
        Op dit apparaat kun je nu geen meldingen ontvangen: koppel Discord via je profiel, of voeg de app toe aan je
        beginscherm voor pushmeldingen.
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-4 pb-3 pt-3.5">
        <p className="section-label">Meldingen via</p>
        <p className="mt-1 text-[12.5px] text-ink-3">Kies één kanaal — de categorieën hieronder gelden voor allebei.</p>
      </div>
      <div className="divide-y divide-line border-t border-line" role="radiogroup" aria-label="Meldingen via">
        {hasDiscord && (
          <ChannelRow
            selected={selected === "discord"}
            onClick={selectDiscord}
            disabled={pushBusy}
            icon={<DiscordIcon size={16} />}
            label="Discord"
            description="Privéberichten via de bot."
          />
        )}
        {pushShown && (
          <ChannelRow
            selected={selected === "push"}
            onClick={selectPush}
            disabled={!pushClickable || pushBusy}
            icon={pushState === "denied" ? <ShieldOff size={16} /> : <Bell size={16} />}
            label="Pushmeldingen"
            description={
              pushState === "needs-install"
                ? "Voeg de app toe aan je beginscherm om dit te kunnen aanzetten."
                : pushState === "denied"
                  ? "Geblokkeerd in je browser- of telefooninstellingen voor deze site."
                  : "Meldingen op dit apparaat, ook als de app niet open staat."
            }
            trailing={pushState === "needs-install" ? <Download size={14} className="shrink-0 text-ink-3" /> : undefined}
          />
        )}
      </div>
    </div>
  );
}

function ChannelRow({
  selected,
  onClick,
  disabled,
  icon,
  label,
  description,
  trailing,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  description: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "hover:bg-sunken"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            selected ? "bg-brand-soft text-brand-text" : "bg-sunken text-ink-3"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{label}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-3">{description}</p>
        </div>
      </div>
      {trailing ?? (
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-1.5 ${
            selected ? "border-brand-text bg-brand-text text-brand-on" : "border-line text-transparent"
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
