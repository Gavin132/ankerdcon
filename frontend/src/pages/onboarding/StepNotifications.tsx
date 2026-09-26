import { Bell, BellOff, MessageSquareOff } from "lucide-react";
import { NOTIFICATION_CATEGORIES } from "../../constants/notifications";
import type { ProfileState } from "./types";

interface StepNotificationsProps {
  state: ProfileState;
  onChange: (patch: Partial<ProfileState>) => void;
  hasDiscord: boolean;
}

export function StepNotifications({ state, onChange, hasDiscord }: StepNotificationsProps) {
  function toggleCategory(id: string) {
    onChange({
      notificationCategories: state.notificationCategories.includes(id)
        ? state.notificationCategories.filter((c) => c !== id)
        : [...state.notificationCategories, id],
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-ink">Kies je notificaties</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Alles staat standaard uit — zet aan waar je een DM van de bot voor wilt. Je kunt dit later altijd aanpassen.
        </p>
      </div>

      {!hasDiscord && (
        <div className="flex items-start gap-3 rounded-xl border-1.5 border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            <MessageSquareOff size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              Je ontvangt nog geen Discord DM's
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
              Je bent ingelogd met Google, dus de bot heeft geen Discord-account om naartoe te sturen.
              Je kunt dit hierna alsnog koppelen via je profiel — de keuzes hieronder blijven bewaard voor als je dat doet.
            </p>
          </div>
        </div>
      )}

      <div className="card-surface p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${state.allowDm ? "bg-brand-soft text-brand-text" : "bg-sunken text-ink-3"}`}>
              {state.allowDm
                ? <Bell size={16} />
                : <BellOff size={16} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Discord DM's</p>
              <p className="mt-0.5 text-xs text-ink-3">
                {state.allowDm
                  ? "Aan — kies hieronder waarvoor je een bericht wilt."
                  : "Uit — je krijgt geen DM's, ongeacht wat je hieronder aanvinkt."}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.allowDm}
            onClick={() => onChange({ allowDm: !state.allowDm })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              state.allowDm ? "bg-brand-text" : "bg-line"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white transform transition-transform duration-200 ${
                state.allowDm ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className={`card-surface divide-y divide-line overflow-hidden transition-opacity ${state.allowDm ? "" : "opacity-40 pointer-events-none"}`}>
        {NOTIFICATION_CATEGORIES.map((cat) => {
          const checked = state.notificationCategories.includes(cat.id);
          return (
            <label
              key={cat.id}
              className="flex cursor-pointer items-start gap-3 px-3.5 py-3 transition-colors hover:bg-sunken"
            >
              <input
                type="checkbox"
                className="cb mt-0.5"
                checked={checked}
                onChange={() => toggleCategory(cat.id)}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{cat.label}</p>
                <p className="mt-0.5 text-xs text-ink-3">{cat.description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
