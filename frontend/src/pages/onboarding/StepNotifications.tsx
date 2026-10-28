import { categoriesFor } from "../../constants/notifications";
import { NotificationChannelPicker } from "../../components/notifications/NotificationChannelPicker";
import { NoDiscordNotice } from "../../components/notifications/NoDiscordNotice";
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
          Alles staat standaard uit — zet aan waar je bericht over wilt krijgen. Je kunt dit later altijd aanpassen.
        </p>
      </div>

      {!hasDiscord && <NoDiscordNotice extra="De keuzes hieronder blijven bewaard voor als je dat doet." />}

      <NotificationChannelPicker
        allowDm={state.allowDm}
        onAllowDmChange={(v) => onChange({ allowDm: v })}
        hasDiscord={hasDiscord}
      />

      <div className="card-surface divide-y divide-line overflow-hidden">
        {categoriesFor(false).map((cat) => {
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
