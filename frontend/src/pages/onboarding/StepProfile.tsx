import { useRef, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Plus, Smartphone, Trash2, X } from "lucide-react";
import { validatePhoneNumber } from "../../utils/validation";
import { ColorSwatch } from "./ColorSwatch";
import { NAME_COLORS, BANNER_COLORS } from "./constants";
import type { ProfileState } from "./types";
import { useCurrentUser, useDeleteAvatar, useDeleteBanner, useUploadAvatar, useUploadBanner } from "../../hooks/useUsers";
import { prepareAvatarFile } from "../../utils/imageCompression";
import { avatarColor } from "../../utils/avatar";
import { BannerCropModal } from "../../components/profile/BannerCropModal";
import { toast } from "../../store/toast.store";

function getBannerStyle(bannerColor: string, bannerUrl?: string, bannerPosition?: string): React.CSSProperties {
  if (bannerUrl) return { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: bannerPosition || "center" };
  if (bannerColor) return { backgroundColor: bannerColor };
  return { backgroundColor: "#0F1519" };
}

interface StepProfileProps {
  state: ProfileState;
  onChange: (patch: Partial<ProfileState>) => void;
}

/** Uploads here are immediate (same mutations as the Profiel page), not part
 * of the deferred "finish" payload — by the time someone continues past this
 * step, a photo they set has already been saved for real. */
function ProfilePhotos({ bannerColor }: { bannerColor: string }) {
  const { data: me } = useCurrentUser();
  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();
  const uploadBannerMutation = useUploadBanner();
  const deleteBannerMutation = useDeleteBanner();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [avatarImgErr, setAvatarImgErr] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const hasAvatar = !!me?.avatar_url && !avatarImgErr;

  async function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      await uploadAvatarMutation.mutateAsync(await prepareAvatarFile(f));
      setAvatarImgErr(false);
      toast("success", "Profielfoto bijgewerkt!");
    } catch (err) {
      toast("error", err instanceof Error && err.message ? err.message : "Kon profielfoto niet uploaden.");
    }
  }

  async function onAvatarDelete() {
    try {
      await deleteAvatarMutation.mutateAsync();
      toast("success", "Profielfoto verwijderd, terug naar Discord/Google.");
    } catch {
      toast("error", "Kon profielfoto niet verwijderen.");
    }
  }

  function onBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setCropFile(f);
    setCropOpen(true);
  }

  async function onBannerConfirm(blob: Blob, isGif: boolean, position?: string) {
    setCropOpen(false);
    try {
      await uploadBannerMutation.mutateAsync({ blob, mimeType: isGif ? "image/gif" : "image/jpeg", position: isGif ? position : undefined });
      toast("success", "Banner bijgewerkt!");
    } catch {
      toast("error", "Kon banner niet uploaden.");
    }
  }

  async function onBannerDelete() {
    try {
      await deleteBannerMutation.mutateAsync();
      toast("success", "Banner verwijderd.");
    } catch {
      toast("error", "Kon banner niet verwijderen.");
    }
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="relative h-[90px] w-full" style={getBannerStyle(bannerColor, me?.banner_url, me?.banner_position)}>
        <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={onBannerFileChange} />
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          {me?.banner_url && (
            <button
              type="button"
              onClick={onBannerDelete}
              disabled={deleteBannerMutation.isPending}
              aria-label="Banner verwijderen"
              title="Banner verwijderen"
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink/70 text-paper backdrop-blur-sm transition-colors hover:bg-ink/90 disabled:opacity-60"
            >
              {deleteBannerMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadBannerMutation.isPending}
            aria-label="Banner wijzigen"
            title="Banner wijzigen"
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink/70 text-paper backdrop-blur-sm transition-transform hover:bg-ink/90 active:scale-95 disabled:opacity-60"
          >
            {uploadBannerMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
          </button>
        </div>
      </div>

      <div className="flex items-end gap-3 px-4 pb-3.5">
        <div className="relative -mt-9 shrink-0">
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onAvatarFileChange} />
          <div
            className={`flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-4 border-surface ${
              !hasAvatar ? `bg-gradient-to-br ${avatarColor(me?.name ?? "")}` : ""
            }`}
          >
            {hasAvatar ? (
              <img src={me!.avatar_url} alt="" className="h-full w-full object-cover" onError={() => setAvatarImgErr(true)} />
            ) : (
              <span className="text-xl font-bold text-white">{(me?.name ?? "?")[0]?.toUpperCase()}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadAvatarMutation.isPending}
            aria-label="Profielfoto wijzigen"
            title="Profielfoto wijzigen"
            className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-paper transition-transform active:scale-95 disabled:opacity-60"
          >
            {uploadAvatarMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Pencil size={11} />}
          </button>
        </div>

        <div className="min-w-0 flex-1 pb-0.5">
          <p className="text-[13px] font-semibold text-ink">Profielfoto &amp; banner</p>
          <p className="mt-0.5 text-xs text-ink-3">Optioneel — later aan te passen via je profiel.</p>
        </div>

        {me?.avatar_custom && (
          <button
            type="button"
            onClick={onAvatarDelete}
            disabled={deleteAvatarMutation.isPending}
            aria-label="Profielfoto verwijderen"
            title="Profielfoto verwijderen"
            className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-60"
          >
            {deleteAvatarMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        )}
      </div>

      <BannerCropModal open={cropOpen} file={cropFile} onClose={() => setCropOpen(false)} onConfirm={onBannerConfirm} />
    </div>
  );
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

      <ProfilePhotos bannerColor={state.bannerColor} />

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
