import { useRef, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Smartphone, Trash2 } from "lucide-react";
import { validatePhoneNumber } from "../../utils/validation";
import { ColorSwatch } from "../../components/profile/ColorSwatch";
import { NAME_COLORS, getBannerStyle } from "../../utils/profile";
import type { ProfileState } from "./types";
import { useCurrentUser, useDeleteAvatar, useDeleteBanner, useUploadAvatar, useUploadBanner } from "../../hooks/useUsers";
import { prepareAvatarFile } from "../../utils/imageCompression";
import { avatarColor } from "../../utils/avatar";
import { BannerCropModal } from "../../components/profile/BannerCropModal";
import { toast } from "../../store/toast.store";

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
              className="hit-area flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink/80 text-paper transition-colors hover:bg-ink disabled:opacity-60"
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
            className="hit-area flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink/80 text-paper transition-colors hover:bg-ink disabled:opacity-60"
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
              !hasAvatar ? avatarColor(me?.name ?? "") : ""
            }`}
          >
            {hasAvatar ? (
              <img src={me!.avatar_url} alt="" className="h-full w-full object-cover" onError={() => setAvatarImgErr(true)} />
            ) : (
              <span className="text-xl font-bold text-avatar-on">{(me?.name ?? "?")[0]?.toUpperCase()}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadAvatarMutation.isPending}
            aria-label="Profielfoto wijzigen"
            title="Profielfoto wijzigen"
            className="hit-area absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-paper disabled:opacity-60"
          >
            {uploadAvatarMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
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
            className="hit-area mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-60"
          >
            {deleteAvatarMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>

      <BannerCropModal open={cropOpen} file={cropFile} onClose={() => setCropOpen(false)} onConfirm={onBannerConfirm} />
    </div>
  );
}

export function StepProfile({ state, onChange }: StepProfileProps) {
  const phoneError = state.phone ? validatePhoneNumber(state.phone) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-ink">Stel je profiel in</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Alle velden zijn optioneel. Aliassen en bannerkleur stel je later in op je profiel.
        </p>
      </div>

      <ProfilePhotos bannerColor={state.bannerColor} />

      <div className="space-y-5">
        {/* Pronouns */}
        <div>
          <label className="field-label">
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
          <label className="field-label">
            Telefoonnummer
          </label>
          <div className="relative">
            <Smartphone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="+31 6 12345678"
              className={`input-field pl-9 ${phoneError && state.phone ? "!border-bad-fill" : ""}`}
              value={state.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </div>
          {phoneError && state.phone && (
            <p className="field-error flex items-center gap-1">
              <AlertTriangle size={12} /> {phoneError}
            </p>
          )}
          <p className="mt-1.5 text-xs text-ink-3">
            Zichtbaar voor andere deelnemers.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="field-label">
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
            <span className="pointer-events-none absolute bottom-3 right-3 select-none font-mono text-[12px] text-ink-3">
              {200 - state.bio.length}
            </span>
          </div>
        </div>

        {/* Name color */}
        <div>
          <label className="field-label">
            Naamkleur
          </label>
          <ColorSwatch value={state.color} onChange={(v) => onChange({ color: v })} presets={NAME_COLORS} on="paper" />
        </div>
      </div>
    </div>
  );
}
