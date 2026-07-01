import { useState } from "react";
import { AlertTriangle, Bell, BellOff, Plus, Smartphone, X } from "lucide-react";
import { validatePhoneNumber } from "../../utils/validation";
import { ColorSwatch } from "./ColorSwatch";
import { NAME_COLORS, BANNER_COLORS } from "./constants";
import type { ProfileState } from "./types";

interface StepProfileProps {
  state: ProfileState;
  onChange: (patch: Partial<ProfileState>) => void;
}

export function StepProfile({ state, onChange }: StepProfileProps) {
  const [aliasInput, setAliasInput] = useState("");
  const phoneError = state.phone ? validatePhoneNumber(state.phone) : null;

  function addAlias() {
    const trimmed = aliasInput.trim();
    if (!trimmed || trimmed.length > 30 || state.aliases.includes(trimmed) || state.aliases.length >= 10) return;
    onChange({ aliases: [...state.aliases, trimmed] });
    setAliasInput("");
  }

  function removeAlias(alias: string) {
    onChange({ aliases: state.aliases.filter((a) => a !== alias) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Stel je profiel in</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Alle velden zijn optioneel — je kunt dit later altijd aanpassen.
        </p>
      </div>

      <div className="space-y-5">
        {/* Pronouns */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
            Voornaamwoorden
          </label>
          <input
            type="text"
            maxLength={40}
            placeholder="bijv. hij/hem, zij/haar, die/hen"
            className="input-field"
            value={state.pronouns}
            onChange={(e) => onChange({ pronouns: e.target.value })}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
            Telefoonnummer
          </label>
          <div className="relative">
            <Smartphone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              maxLength={20}
              placeholder="+31 6 12345678"
              className={`input-field pl-9 ${phoneError && state.phone ? "border-rose-400 dark:border-rose-700" : ""}`}
              value={state.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </div>
          {phoneError && state.phone && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
              <AlertTriangle size={11} /> {phoneError}
            </p>
          )}
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            Zichtbaar voor andere deelnemers.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
            Bio
          </label>
          <div className="relative">
            <textarea
              rows={3}
              maxLength={200}
              placeholder="Vertel iets over jezelf..."
              className="input-field resize-none"
              value={state.bio}
              onChange={(e) => onChange({ bio: e.target.value })}
            />
            <span className="absolute bottom-3 right-3 text-[11px] text-slate-300 dark:text-slate-600 pointer-events-none select-none">
              {200 - state.bio.length}
            </span>
          </div>
        </div>

        {/* Name color */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            Naamkleur
          </label>
          <ColorSwatch value={state.color} onChange={(v) => onChange({ color: v })} presets={NAME_COLORS} />
          {state.color && (
            <div className="mt-2.5 inline-flex items-center rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5">
              <span className="text-sm font-black" style={{ color: state.color }}>
                Voorbeeld naam
              </span>
            </div>
          )}
        </div>

        {/* Banner color */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            Profielbanner
          </label>
          <div
            className="h-10 w-full rounded-xl mb-3 border border-slate-100 dark:border-slate-800 transition-colors"
            style={state.bannerColor ? { backgroundColor: state.bannerColor } : { background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}
          />
          <ColorSwatch value={state.bannerColor} onChange={(v) => onChange({ bannerColor: v })} presets={BANNER_COLORS} />
        </div>

        {/* Aliases */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
            Aliassen
          </label>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
            Bijnamen waaronder andere deelnemers jou kennen (max. 10).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={30}
              placeholder="bijv. een bijnaam"
              className="input-field flex-1"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
            />
            <button
              type="button"
              onClick={addAlias}
              disabled={!aliasInput.trim() || state.aliases.length >= 10}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>
          {state.aliases.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {state.aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  {alias}
                  <button
                    type="button"
                    onClick={() => removeAlias(alias)}
                    className="ml-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Discord DM toggle */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${state.allowDm ? "bg-sky-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                {state.allowDm
                  ? <Bell size={16} className="text-sky-500" />
                  : <BellOff size={16} className="text-slate-400" />
                }
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Discord notificaties</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Ontvang een DM bij accountwijzigingen
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
      </div>
    </div>
  );
}
