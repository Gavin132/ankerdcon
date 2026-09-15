import { useState } from "react";
import { AlertTriangle, Plus, Smartphone, X } from "lucide-react";
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
        <h2 className="font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-ink">Stel je profiel in</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Alle velden zijn optioneel — je kunt dit later altijd aanpassen.
        </p>
      </div>

      <div className="space-y-5">
        {/* Pronouns */}
        <div>
          <label className="section-label mb-1.5 block">
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
          <label className="section-label mb-1.5 block">
            Telefoonnummer
          </label>
          <div className="relative">
            <Smartphone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="tel"
              maxLength={20}
              placeholder="+31 6 12345678"
              className={`input-field pl-9 ${phoneError && state.phone ? "!border-rose-500 dark:!border-rose-400" : ""}`}
              value={state.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </div>
          {phoneError && state.phone && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle size={11} /> {phoneError}
            </p>
          )}
          <p className="mt-1.5 text-xs text-ink-3">
            Zichtbaar voor andere deelnemers.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="section-label mb-1.5 block">
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
            <span className="pointer-events-none absolute bottom-3 right-3 select-none font-mono text-[11px] text-ink-3">
              {200 - state.bio.length}
            </span>
          </div>
        </div>

        {/* Name color */}
        <div>
          <label className="section-label mb-2 block">
            Naamkleur
          </label>
          <ColorSwatch value={state.color} onChange={(v) => onChange({ color: v })} presets={NAME_COLORS} />
          {state.color && (
            <div className="mt-2.5 inline-flex items-center rounded-lg bg-sunken px-3 py-1.5">
              <span className="text-sm font-bold" style={{ color: state.color }}>
                Voorbeeld naam
              </span>
            </div>
          )}
        </div>

        {/* Banner color */}
        <div>
          <label className="section-label mb-2 block">
            Profielbanner
          </label>
          <div
            className="mb-3 h-10 w-full rounded-xl border-1.5 border-line transition-colors"
            style={{ backgroundColor: state.bannerColor || "#0F1519" }}
          />
          <ColorSwatch value={state.bannerColor} onChange={(v) => onChange({ bannerColor: v })} presets={BANNER_COLORS} />
        </div>

        {/* Aliases */}
        <div>
          <label className="section-label mb-1.5 block">
            Aliassen
          </label>
          <p className="mb-2 text-xs leading-relaxed text-ink-3">
            Bijnamen waaronder andere leden jou kennen (max. 10). Dit maakt het zoeken naar jou makkelijker voor andere leden. Je kunt dit later altijd aanpassen in je profiel.
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
              className="flex w-[50px] shrink-0 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink transition-colors hover:border-ink-3 disabled:opacity-40"
            >
              <Plus size={15} />
            </button>
          </div>
          {state.aliases.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {state.aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center gap-1 rounded-full border-1.5 border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2"
                >
                  {alias}
                  <button
                    type="button"
                    onClick={() => removeAlias(alias)}
                    className="ml-0.5 text-ink-3 transition-colors hover:text-ink"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
