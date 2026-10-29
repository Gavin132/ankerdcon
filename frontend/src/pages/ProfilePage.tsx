import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { routes } from "../config/routes";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useSmartBack } from "../hooks/useSmartBack";
import { useCurrentTripRoomNumbers } from "../hooks/useTripRooms";
import { useBadges } from "../hooks/useBadges";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { DiscordIcon } from "../components/common/DiscordIcon";
import { UserPhotos } from "../components/profile/UserPhotos";
import { UnsavedChangesModal } from "../components/common/UnsavedChangesModal";
import {
  AlertTriangle,
  BedDouble,
  Eye,
  Phone,
  MapPin,
  Pencil,
  Loader2,
  Save,
  Smartphone,
  Plus,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { LocationPingDisplay } from "../components/common/LocationPingDisplay";
import { isPingFresh } from "../utils/locationPing";
import {
  useUser,
  useUpdatePreferences,
  useUpdateName,
  useUploadBanner,
  useDeleteBanner,
  useUploadAvatar,
  useDeleteAvatar,
} from "../hooks/useUsers";
import { BannerCropModal } from "../components/profile/BannerCropModal";
import { ColorSwatch } from "../components/profile/ColorSwatch";
import { EmptyState } from "../components/common/EmptyState";
import { BadgeIcon } from "../components/common/BadgeIcon";
import { useAuthStore } from "../store/auth.store";
import { avatarColor, avatarSrc } from "../utils/avatar";
import { prepareAvatarFile } from "../utils/imageCompression";
import { FONT_MAP, NAME_COLORS, BANNER_COLORS, getBannerStyle, readableNameColor } from "../utils/profile";
import { useThemeStore } from "../store/theme.store";
import { toast } from "../store/toast.store";
import { validateDisplayName, validatePhoneNumber } from "../utils/validation";
import type { Badge, FontOption, User } from "../types";

const FONT_OPTIONS: { value: FontOption; label: string }[] = [
  { value: "default", label: "Standaard" },
  { value: "mono", label: "Mono" },
  { value: "serif", label: "Schreef" },
  { value: "cursive", label: "Cursief" },
  { value: "display", label: "Display" },
];

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

// ─── Section panel ────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-surface overflow-hidden ${className}`}>
      {title && (
        <div className="border-b border-line px-5 pb-3 pt-4 sm:px-6">
          <p className="section-label">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-ink-3">{subtitle}</p>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

// ─── Profile head: banner, avatar, name, pronouns, badges ─────────────────────

function ProfileHead({
  user,
  hasAvatar,
  onAvatarError,
  avatarColorValue,
  bannerStyle,
  nameStyle,
  pronouns,
  badges,
  actions,
  children,
  onEditAvatar,
  avatarUploading,
  onDeleteAvatar,
  avatarDeleting,
  onEditBanner,
  bannerUploading,
  onDeleteBanner,
  bannerDeleting,
  hasBanner,
}: {
  user: User;
  hasAvatar: boolean;
  onAvatarError: () => void;
  /** The user's own avatar colour (overrides the generated one). */
  avatarColorValue: string;
  bannerStyle: React.CSSProperties;
  nameStyle: React.CSSProperties;
  pronouns: string;
  badges: Badge[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Present only on your own profile: a pencil badge on the avatar opens the
   * file picker directly, replacing the Discord badge in that corner — once
   * you can change it, "via Discord" is no longer the interesting fact. */
  onEditAvatar?: () => void;
  avatarUploading?: boolean;
  /** Only offered once there's something of yours to remove. */
  onDeleteAvatar?: () => void;
  avatarDeleting?: boolean;
  /** Same idea as onEditAvatar, for the banner image. */
  onEditBanner?: () => void;
  bannerUploading?: boolean;
  onDeleteBanner?: () => void;
  bannerDeleting?: boolean;
  /** Whether there's a banner image to remove (vs. just a colour). */
  hasBanner?: boolean;
}) {
  return (
    <div className="card-surface overflow-hidden">
      {/* Banner — the user's own image or colour */}
      <div className="relative h-[128px] w-full sm:h-[200px]" style={bannerStyle}>
        {onEditBanner && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            {onDeleteBanner && hasBanner && (
              <button
                type="button"
                onClick={onDeleteBanner}
                disabled={bannerDeleting}
                aria-label="Banner verwijderen"
                title="Banner verwijderen"
                className="hit-area flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-ink/80 text-paper transition-colors hover:bg-ink disabled:opacity-60"
              >
                {bannerDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
            <button
              type="button"
              onClick={onEditBanner}
              disabled={bannerUploading}
              aria-label="Banner wijzigen"
              title="Banner wijzigen"
              className="hit-area flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-ink/80 text-paper transition-colors hover:bg-ink disabled:opacity-60"
            >
              {bannerUploading ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            </button>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex items-end justify-between gap-3">
          {/* Avatar — overlaps the banner bottom edge */}
          <div className="flex shrink-0 flex-col items-start">
          <div className="relative -mt-[44px] shrink-0">
            <div
              className={`flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full border-4 border-surface ${
                !hasAvatar ? `bg-gradient-to-br ${avatarColor(user.name)}` : ""
              }`}
              style={
                !hasAvatar && avatarColorValue
                  ? { backgroundColor: avatarColorValue, backgroundImage: "none" }
                  : undefined
              }
            >
              {hasAvatar ? (
                <img
                  src={avatarSrc(user.avatar_url!, 112)}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  onError={onAvatarError}
                />
              ) : (
                <span className="text-3xl font-bold text-avatar-on">
                  {user.name[0].toUpperCase()}
                </span>
              )}
            </div>
            {onEditAvatar ? (
              /* Own profile: a pencil to change the photo, next to a trash
                 can when there's a custom upload to remove — same pairing as
                 the banner's top-right corner. Takes this corner over from
                 the Discord badge, since once you can edit it, "via Discord"
                 isn't the interesting fact anymore. */
              <div className="absolute bottom-1 right-0 flex items-center gap-1.5">
                {onDeleteAvatar && user.avatar_custom && (
                  <button
                    type="button"
                    onClick={onDeleteAvatar}
                    disabled={avatarDeleting}
                    aria-label="Profielfoto verwijderen"
                    title="Profielfoto verwijderen"
                    className="hit-area flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink/80 text-paper transition-colors hover:bg-ink disabled:opacity-60"
                  >
                    {avatarDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onEditAvatar}
                  disabled={avatarUploading}
                  aria-label="Profielfoto wijzigen"
                  title="Profielfoto wijzigen"
                  className="hit-area flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink text-paper disabled:opacity-60"
                >
                  {avatarUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Pencil size={12} />
                  )}
                </button>
              </div>
            ) : (
              hasAvatar && !user.avatar_custom && (
                <div className="absolute bottom-1 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-paper">
                  <DiscordIcon size={12} />
                </div>
              )
            )}
          </div>
          </div>

          {actions && <div className="flex shrink-0 items-center gap-2 pt-3">{actions}</div>}
        </div>

        <h1
          className="mt-3 break-words font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-ink md:text-[42px]"
          style={nameStyle}
        >
          {user.name}
        </h1>
        {pronouns && <p className="mt-1.5 text-sm text-ink-2">{pronouns}</p>}

        {badges.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {badges.map((badge) => (
              <BadgeIcon key={badge.id} badge={badge} size="md" />
            ))}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

// ─── View-only profile card ───────────────────────────────────────────────────

function ViewProfile({
  user,
  room,
  displayColor,
  displayBio,
  displayPronouns,
  bannerStyle,
  nameStyle,
  badges,
}: {
  user: User;
  /** Room number on the current trip, from the room assignments. */
  room?: string;
  displayColor: string;
  displayBio: string;
  displayPronouns: string;
  bannerStyle: React.CSSProperties;
  nameStyle: React.CSSProperties;
  badges: Badge[];
}) {
  const [imgErr, setImgErr] = useState(false);
  const hasAvatar = !!user.avatar_url && !imgErr;

  return (
    <ProfileHead
      user={user}
      hasAvatar={hasAvatar}
      onAvatarError={() => setImgErr(true)}
      avatarColorValue={displayColor}
      bannerStyle={bannerStyle}
      nameStyle={nameStyle}
      pronouns={displayPronouns}
      badges={badges}
    >
      {displayBio && (
        <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-ink-2">
          {displayBio}
        </p>
      )}

      {(room || user.phone_number || isPingFresh(user.live_location_ping)) && (
        <div className="mt-4 space-y-2.5 border-t border-line pt-4">
          {room && (
            <div className="flex items-center gap-2.5 text-sm text-ink-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <BedDouble size={16} />
              </span>
              Kamer {room}
            </div>
          )}
          {user.phone_number && (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Phone size={16} />
              </span>
              <a href={`tel:${user.phone_number}`} className="hit-area font-medium text-brand-text">
                {user.phone_number}
              </a>
            </div>
          )}
          {isPingFresh(user.live_location_ping) && (
            <div className="flex items-center gap-2.5 text-sm text-ink-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg pill-ok">
                <MapPin size={16} />
              </span>
              <LocationPingDisplay
                raw={user.live_location_ping}
                align="start"
              />
            </div>
          )}
        </div>
      )}
    </ProfileHead>
  );
}
// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const isDark = useThemeStore((s) => s.isDark);
  const { userId } = useParams<{ userId: string }>();
  const decodedName = userId ? decodeURIComponent(userId) : "";
  // `?preview=1` shows your own profile the way others see it.
  const [searchParams] = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const navigate = useNavigate();
  const goBack = useSmartBack(routes.hub);
  const currentUser = useAuthStore((s) => s.currentUser);

  const { data: user, isLoading } = useUser(decodedName);
  const { data: allBadges = [] } = useBadges();
  const updateMutation = useUpdatePreferences();
  const renameMutation = useUpdateName();
  const uploadBannerMutation = useUploadBanner();
  const deleteBannerMutation = useDeleteBanner();
  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();

  // The route may carry the member's id instead of their name, so compare with the loaded profile too.
  const isOwn = (currentUser === decodedName || (!!user && currentUser === user.name)) && !preview;
  const roomNumbers = useCurrentTripRoomNumbers();

  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftColor, setDraftColor] = useState("");
  const [draftBanner, setDraftBanner] = useState("");
  const [draftFont, setDraftFont] = useState<FontOption>("default");
  const [draftPronouns, setDraftPronouns] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftAliases, setDraftAliases] = useState<string[]>([]);
  const [draftBannerPosition, setDraftBannerPosition] = useState<string>("");
  const [aliasInput, setAliasInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<{
    name: string; bio: string; color: string; banner: string; font: FontOption;
    pronouns: string; phone: string; aliases: string[]; bannerPosition: string;
  } | null>(null);
  const [avatarImgErr, setAvatarImgErr] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const hasAvatar = !!user?.avatar_url && !avatarImgErr;

  const userBadges = (user?.badge_ids ?? [])
    .map((id) => allBadges.find((b) => b.id === id))
    .filter(Boolean)
    .sort((a, b) => a!.display_order - b!.display_order) as Badge[];

  const nameError = validateDisplayName(draftName);
  const phoneError = validatePhoneNumber(draftPhone);

  useEffect(() => {
    if (user && !initialized) {
      const name = user.name;
      const bio = user.bio || "";
      const color = user.color || "";
      const banner = user.banner_color || "";
      const font = (user.font as FontOption) || "default";
      const pronouns = user.pronouns || "";
      const phone = user.phone_number || "";
      const aliases = user.aliases ?? [];
      const bannerPosition = user.banner_position || "";

      setDraftName(name);
      setDraftBio(bio);
      setDraftColor(color);
      setDraftBanner(banner);
      setDraftFont(font);
      setDraftPronouns(pronouns);
      setDraftPhone(phone);
      setDraftAliases(aliases);
      setDraftBannerPosition(bannerPosition);
      setSavedSnapshot({ name, bio, color, banner, font, pronouns, phone, aliases, bannerPosition });
      setInitialized(true);
    }
  }, [user, initialized]);

  const isDirty = useMemo(() => {
    if (!isOwn || !savedSnapshot) return false;
    return (
      draftName.trim() !== savedSnapshot.name ||
      draftBio !== savedSnapshot.bio ||
      draftColor !== savedSnapshot.color ||
      draftBanner !== savedSnapshot.banner ||
      draftFont !== savedSnapshot.font ||
      draftPronouns !== savedSnapshot.pronouns ||
      draftPhone !== savedSnapshot.phone ||
      draftBannerPosition !== savedSnapshot.bannerPosition ||
      draftAliases.length !== savedSnapshot.aliases.length ||
      draftAliases.some((a, i) => a !== savedSnapshot.aliases[i])
    );
  }, [isOwn, savedSnapshot, draftName, draftBio, draftColor, draftBanner, draftFont, draftPronouns, draftPhone, draftBannerPosition, draftAliases]);

  const blocker = useUnsavedChangesGuard(isDirty);

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
      await uploadBannerMutation.mutateAsync({
        blob,
        mimeType: isGif ? "image/gif" : "image/jpeg",
        position: isGif ? position : undefined,
      });
      setDraftBannerPosition(isGif && position ? position : "");
      toast("success", "Banner bijgewerkt!");
    } catch {
      toast("error", "Kon banner niet uploaden.");
    }
  }

  async function onBannerDelete() {
    try {
      await deleteBannerMutation.mutateAsync();
      setDraftBannerPosition("");
      toast("success", "Banner verwijderd.");
    } catch {
      toast("error", "Kon banner niet verwijderen.");
    }
  }

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

  async function onSave() {
    if (phoneError) {
      toast("error", phoneError);
      return;
    }
    const trimmedName = draftName.trim();
    const nameChanged = trimmedName !== user?.name;
    if (nameChanged && (!trimmedName || nameError)) {
      toast("error", nameError ?? "Ongeldige weergavenaam.");
      return;
    }
    try {
      if (nameChanged) {
        await renameMutation.mutateAsync({ new_name: trimmedName });
      }
      await updateMutation.mutateAsync({
        bio: draftBio,
        color: draftColor || "",
        font: draftFont,
        banner_color: draftBanner,
        banner_position: draftBannerPosition || undefined,
        pronouns: draftPronouns,
        phone_number: draftPhone || "",
        aliases: draftAliases,
      });
      setSavedSnapshot({
        name: trimmedName,
        bio: draftBio,
        color: draftColor,
        banner: draftBanner,
        font: draftFont,
        pronouns: draftPronouns,
        phone: draftPhone,
        aliases: draftAliases,
        bannerPosition: draftBannerPosition,
      });
      toast("success", "Profiel opgeslagen!");
    } catch (err) {
      toast("error", err instanceof Error && err.message ? err.message : "Kon profiel niet opslaan.");
    }
  }

  const displayBanner = isOwn ? draftBanner : user?.banner_color || "";
  const displayColor = isOwn ? draftColor : user?.color || "";
  const displayFont = isOwn
    ? draftFont
    : (user?.font as FontOption) || "default";
  const displayBio = isOwn ? draftBio : user?.bio || "";
  const displayPronouns = isOwn ? draftPronouns : user?.pronouns || "";

  const displayBannerPosition = isOwn ? draftBannerPosition : user?.banner_position || "";
  const bannerStyle = getBannerStyle(
    displayBanner,
    user?.banner_url ?? undefined,
    displayBannerPosition || undefined,
  );
  const nameStyle: React.CSSProperties = {
    color: readableNameColor(displayColor, isDark),
    fontFamily:
      displayFont && displayFont !== "default"
        ? FONT_MAP[displayFont]
        : undefined,
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-paper">
        <DetailTopbar title="Profiel" onBack={goBack} />
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-paper">
        <DetailTopbar title="Profiel" onBack={goBack} />
        <EmptyState
          icon={<UserX size={22} />}
          title="Profiel niet gevonden"
          description="Dit lid bestaat niet (meer), of de link klopt niet."
          action={<Button variant="secondary" onClick={goBack}>Terug</Button>}
        />
      </div>
    );
  }

  // ── View-only ─────────────────────────────────────────────────────────────

  if (!isOwn) {
    return (
      <div className="min-h-[100dvh] bg-paper">
        <DetailTopbar title="Profiel" onBack={goBack} />
        <div
          className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8"
          style={{
            paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <ViewProfile
              user={user}
              room={roomNumbers.get(user.name.toLowerCase())}
              bannerStyle={bannerStyle}
              displayColor={displayColor}
              displayBio={displayBio}
              displayPronouns={displayPronouns}
              nameStyle={nameStyle}
              badges={userBadges}
            />
            <div className="mt-5">
              <UserPhotos identifier={user.id ?? user.name} whose={user.name} />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Edit layout ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-paper">
      <DetailTopbar
        title="Profiel"
        onBack={goBack}
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate(`${routes.profile.view(decodedName)}?preview=1`)}
              className="icon-btn"
              aria-label="Zo zien anderen je profiel"
              title="Zo zien anderen je profiel"
            >
              <Eye size={16} />
            </button>
            {/* Always in reach, and only blue when there is something to save. */}
            <Button
              size="sm"
              onClick={onSave}
              disabled={!isDirty}
              loading={updateMutation.isPending || renameMutation.isPending}
            >
              <Save size={14} />
              Opslaan
            </Button>
          </>
        }
      />

      <motion.div
        className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:py-8"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {/* ── Profile head ───────────────────────────────────────────────── */}
        <ProfileHead
          user={user}
          hasAvatar={hasAvatar}
          onAvatarError={() => setAvatarImgErr(true)}
          avatarColorValue={draftColor}
          bannerStyle={bannerStyle}
          nameStyle={nameStyle}
          pronouns={draftPronouns}
          badges={userBadges}
          onEditAvatar={() => avatarInputRef.current?.click()}
          avatarUploading={uploadAvatarMutation.isPending}
          onDeleteAvatar={onAvatarDelete}
          avatarDeleting={deleteAvatarMutation.isPending}
          onEditBanner={() => bannerInputRef.current?.click()}
          bannerUploading={uploadBannerMutation.isPending}
          onDeleteBanner={onBannerDelete}
          bannerDeleting={deleteBannerMutation.isPending}
          hasBanner={!!user.banner_url}
        />
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onAvatarFileChange}
        />
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={onBannerFileChange}
        />
        <p className="-mt-2 px-1 text-xs text-ink-3">
          Foto en banner worden meteen opgeslagen. De rest sla je op met Opslaan, bovenin.
        </p>

        {/* ── Persoonlijke info ──────────────────────────────────────────── */}
        <Card
          title="Persoonlijke info"
          subtitle="Pas hier je persoonlijke gegevens aan."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Naam */}
            <Field
              label="Weergavenaam"
              hint="Historische data blijft onder de oude naam staan."
            >
              <input
                type="text"
                maxLength={30}
                className={`input-field ${nameError && draftName !== user.name ? "!border-bad-fill" : ""}`}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              {nameError && draftName !== user.name && (
                <p className="field-error flex items-center gap-1">
                  <AlertTriangle size={12} /> {nameError}
                </p>
              )}
            </Field>

            {/* Voornaamwoorden */}
            <Field
              label="Voornaamwoorden"
              hint="Zichtbaar op je profielkaart."
            >
              <input
                type="text"
                maxLength={40}
                className="input-field"
                placeholder="bijv. hij/hem, zij/haar"
                value={draftPronouns}
                onChange={(e) => setDraftPronouns(e.target.value)}
              />
            </Field>

            {/* Telefoonnummer */}
            <Field
              label="Telefoonnummer"
              hint="Zichtbaar voor andere deelnemers."
              className="sm:col-span-2"
            >
              <div className="relative">
                <Smartphone
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <input
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  className={`input-field pl-9 ${phoneError && draftPhone ? "!border-bad-fill" : ""}`}
                  placeholder="+31 6 12345678"
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                />
              </div>
              {phoneError && draftPhone && (
                <p className="field-error flex items-center gap-1">
                  <AlertTriangle size={12} /> {phoneError}
                </p>
              )}
            </Field>

            {/* Bio — full width */}
            <Field label="Bio" className="sm:col-span-2">
              <div className="relative">
                <textarea
                  rows={3}
                  maxLength={200}
                  className="input-field resize-none"
                  placeholder="Vertel iets over jezelf…"
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value)}
                />
                <span className="pointer-events-none absolute bottom-3 right-3 select-none font-mono text-[12px] text-ink-3">
                  {200 - draftBio.length}
                </span>
              </div>
            </Field>

            {/* Aliassen — full width */}
            <Field
              label="Aliassen"
              hint="Andere namen waaronder mensen jou kennen. Zoekopdrachten in aanmeldformulieren herkennen deze namen ook."
              className="sm:col-span-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={30}
                  className="input-field flex-1"
                  placeholder="Voeg een alias toe…"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = aliasInput.trim();
                      if (trimmed && !draftAliases.includes(trimmed) && draftAliases.length < 10) {
                        setDraftAliases([...draftAliases, trimmed]);
                        setAliasInput("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!aliasInput.trim() || draftAliases.includes(aliasInput.trim()) || draftAliases.length >= 10}
                  aria-label="Alias toevoegen"
                  onClick={() => {
                    const trimmed = aliasInput.trim();
                    if (trimmed && !draftAliases.includes(trimmed) && draftAliases.length < 10) {
                      setDraftAliases([...draftAliases, trimmed]);
                      setAliasInput("");
                    }
                  }}
                  className="flex w-[50px] shrink-0 items-center justify-center rounded-xl border-1.5 border-line bg-surface text-ink transition-colors hover:border-ink-3 disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
              {draftAliases.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {draftAliases.map((alias) => (
                    <span
                      key={alias}
                      className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2"
                    >
                      {alias}
                      <button
                        type="button"
                        onClick={() => setDraftAliases(draftAliases.filter((a) => a !== alias))}
                        aria-label={`Alias ${alias} verwijderen`}
                        className="hit-area -mr-1 p-1 text-ink-3 transition-colors hover:text-bad"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>
        </Card>

        {/* ── Weergave ───────────────────────────────────────────────────── */}
        <Card
          title="Weergave"
          subtitle="Pas de visuele stijl van je profiel aan."
        >
          <div className="space-y-6">
            {/* Naamkleur */}
            <Field label="Naamkleur">
              <ColorSwatch value={draftColor} onChange={setDraftColor} presets={NAME_COLORS} customFallback="#94a3b8" />
            </Field>

            {/* Lettertype */}
            <Field label="Lettertype">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {FONT_OPTIONS.map(({ value, label }) => {
                  const isActive = draftFont === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDraftFont(value)}
                      className={`rounded-xl border-1.5 px-1.5 py-3 text-center transition-colors ${
                        isActive
                          ? "border-outline bg-brand-soft"
                          : "border-line bg-surface hover:border-ink-3"
                      }`}
                    >
                      <span
                        className={`mb-1 block text-lg font-bold ${isActive ? "text-ink" : "text-ink-2"}`}
                        style={{
                          fontFamily:
                            value !== "default"
                              ? FONT_MAP[value]
                              : undefined,
                        }}
                      >
                        Aa
                      </span>
                      <span
                        className={`font-mono text-xs ${isActive ? "text-ink" : "text-ink-3"}`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Bannerkleur */}
            <Field label="Bannerkleur" hint="Gebruikt als er geen bannerafbeelding is ingesteld.">
              <ColorSwatch value={draftBanner} onChange={setDraftBanner} presets={BANNER_COLORS} customFallback="#1e293b" />
            </Field>
          </div>
        </Card>

        <UserPhotos identifier={user.id ?? user.name} />
      </motion.div>

      <BannerCropModal
        open={cropOpen}
        file={cropFile}
        onClose={() => setCropOpen(false)}
        onConfirm={onBannerConfirm}
      />

      <UnsavedChangesModal blocker={blocker} />
    </div>
  );
}
