import { Bell, BellOff } from "lucide-react";
import { NOTIFICATION_CATEGORIES } from "../../constants/notifications";
import type { ProfileState } from "./types";

interface StepNotificationsProps {
  state: ProfileState;
  onChange: (patch: Partial<ProfileState>) => void;
}

export function StepNotifications({ state, onChange }: StepNotificationsProps) {
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
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Kies je notificaties</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Alles staat standaard uit — zet aan waar je een DM van de bot voor wilt. Je kunt dit later altijd aanpassen.
        </p>
      </div>

      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${state.allowDm ? "bg-sky-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
              {state.allowDm
                ? <Bell size={16} className="text-sky-500" />
                : <BellOff size={16} className="text-slate-400" />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Discord DM's</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
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
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              state.allowDm ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                state.allowDm ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className={`space-y-1 transition-opacity ${state.allowDm ? "" : "opacity-40 pointer-events-none"}`}>
        {NOTIFICATION_CATEGORIES.map((cat) => {
          const checked = state.notificationCategories.includes(cat.id);
          return (
            <label
              key={cat.id}
              className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                className="cb mt-0.5"
                checked={checked}
                onChange={() => toggleCategory(cat.id)}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cat.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{cat.description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
