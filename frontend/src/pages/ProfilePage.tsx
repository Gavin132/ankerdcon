import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { routes } from "../config/routes";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { useSmartBack, isFreshEntry } from "../hooks/useSmartBack";
import { useCurrentTripRoomNumbers } from "../hooks/useTripRooms";
import { useBadges } from "../hooks/useBadges";
import { HomeLinkButton } from "../components/common/HomeLinkButton";
import { DiscordIcon } from "../components/common/DiscordIcon";
import { UserPhotos } from "../components/profile/UserPhotos";
import { UnsavedChangesModal } from "../components/common/UnsavedChangesModal";
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  BedDouble,
  Phone,
  MapPin,
  Upload,
  Pencil,
  Loader2,
  Save,
  Smartphone,
  Plus,
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
import { BadgeIcon } from "../components/common/BadgeIcon";
import { useAuthStore } from "../store/auth.store";
import { avatarColor } from "../utils/avatar";
import { cropSquareAndCompress } from "../utils/imageCompression";
import { toast } from "../store/toast.store";
import { validateDisplayName, validatePhoneNumber } from "../utils/validation";
import type { Badge, FontOption, User } from "../types";

// Mirrors backend/app/routers/users.py's AVATAR_GIF_MAX_BYTES — checked here
// too so a too-big gif never even starts uploading.
const AVATAR_GIF_MAX_BYTES = 2 * 1024 * 1024;

const FONT_MAP: Record<string, string> = {
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  cursive: "cursive",
  display: 'Impact, "Arial Black", sans-serif',
};

const FONT_OPTIONS: { value: FontOption; label: string }[] = [
  { value: "default", label: "Standaard" },
  { value: "mono", label: "Mono" },
  { value: "serif", label: "Schreef" },
  { value: "cursive", label: "Cursief" },
  { value: "display", label: "Display" },
];

const NAME_COLORS = [
  "#0f172a",
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f43f5e",
  "#f59e0b",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#fb923c",
  "#a3e635",
  "#64748b",
];

const BANNER_COLORS = [
  "#0f172a",
  "#1e293b",
  "#1a1a2e",
  "#2d1b69",
  "#0c4a6e",
  "#14532d",
  "#7c2d12",
  "#1c1917",
  "#0369a1",
  "#064e3b",
  "#4c0519",
  "#292524",
];

function getBannerStyle(
  bannerColor: string,
  bannerUrl?: string,
  bannerPosition?: string,
): React.CSSProperties {
  if (bannerUrl)
    return {
      backgroundImage: `url(${bannerUrl})`,
      backgroundSize: "cover",
      backgroundPosition: bannerPosition || "center",
    };
  if (bannerColor) return { backgroundColor: bannerColor };
  return { backgroundColor: "#0F1519" };
}

const topBarButtonClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink";

// ─── Sticky top bar ───────────────────────────────────────────────────────────

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      className="sticky top-0 z-10 border-b-1.5 border-line bg-surface px-3 sm:px-5"
      style={{
        paddingTop: "max(0.625rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "0.625rem",
      }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <button onClick={onBack} aria-label="Terug" className={topBarButtonClass}>
          <ArrowLeft size={18} />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
          {title}
        </p>
        {isFreshEntry() && (
          <HomeLinkButton size={16} className={topBarButtonClass} />
        )}
      </div>
    </div>
  );
}

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
      <label className="section-label mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

// ─── Color swatch row ─────────────────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
  presets,
  fallback = "#94a3b8",
}: {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  fallback?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange("")}
        className={`flex h-7 w-7 items-center justify-center rounded-full border-1.5 border-line bg-sunken ring-2 ring-offset-2 ring-offset-surface transition-shadow ${
          value === "" ? "ring-outline" : "ring-transparent hover:ring-line"
        }`}
        title="Automatisch"
      >
        {value === "" && <Check size={11} strokeWidth={3} className="text-ink" />}
      </button>

      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? "" : c)}
          className={`flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition-shadow ${
            value === c ? "ring-outline" : "ring-transparent hover:ring-line"
          }`}
          style={{ backgroundColor: c }}
          title={c}
        >
          {value === c && <Check size={11} strokeWidth={3} className="text-white" />}
        </button>
      ))}

      <div className="relative h-7 w-7">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer rounded-full opacity-0"
          title="Aangepaste kleur"
        />
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-1.5 border-dashed border-ink-3 bg-surface text-ink-2">
          <Plus size={13} />
        </div>
      </div>
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
}) {
  return (
    <div className="card-surface overflow-hidden">
      {/* Banner — the user's own image or colour */}
      <div className="h-[128px] w-full sm:h-[200px]" style={bannerStyle} />

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
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  onError={onAvatarError}
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {user.name[0].toUpperCase()}
                </span>
              )}
            </div>
            {onEditAvatar ? (
              /* Own profile: a pencil to change the photo, taking this corner
                 over from the Discord badge — once you can edit it, "via
                 Discord" isn't the interesting fact anymore. */
              <button
                type="button"
                onClick={onEditAvatar}
                disabled={avatarUploading}
                aria-label="Profielfoto wijzigen"
                title="Profielfoto wijzigen"
                className="absolute bottom-1 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink text-paper transition-transform active:scale-95 disabled:opacity-60"
              >
                {avatarUploading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Pencil size={12} />
                )}
              </button>
            ) : (
              hasAvatar && !user.avatar_custom && (
                <div className="absolute bottom-1 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-paper">
                  <DiscordIcon size={12} />
                </div>
              )
            )}
          </div>
          {onDeleteAvatar && user.avatar_custom && (
            <button
              type="button"
              onClick={onDeleteAvatar}
              disabled={avatarDeleting}
              className="mt-1.5 pl-1 text-[11px] font-semibold text-ink-3 underline decoration-dotted underline-offset-2 transition-colors hover:text-ink disabled:opacity-60"
            >
              {avatarDeleting ? "Bezig…" : "Verwijder eigen foto"}
            </button>
          )}
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
                <BedDouble size={15} />
              </span>
              Kamer {room}
            </div>
          )}
          {user.phone_number && (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Phone size={15} />
              </span>
              <a href={`tel:${user.phone_number}`} className="font-medium text-brand-text">
                {user.phone_number}
              </a>
            </div>
          )}
          {isPingFresh(user.live_location_ping) && (
            <div className="flex items-center gap-2.5 text-sm text-ink-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <MapPin size={15} />
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
      // A gif can't go through the square-crop canvas — that would flatten it to
      // one still frame. Uploaded as-is instead (the backend keeps it "klein").
      if (f.type === "image/gif") {
        if (f.size > AVATAR_GIF_MAX_BYTES) {
          toast("error", `Gif te groot. Maximaal ${AVATAR_GIF_MAX_BYTES / (1024 * 1024)} MB voor een profielfoto-gif.`);
          return;
        }
        await uploadAvatarMutation.mutateAsync(f);
      } else {
        const blob = await cropSquareAndCompress(f);
        await uploadAvatarMutation.mutateAsync(blob);
      }
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      toast("error", msg ?? "Kon profiel niet opslaan.");
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
    color: displayColor || undefined,
    fontFamily:
      displayFont && displayFont !== "default"
        ? FONT_MAP[displayFont]
        : undefined,
  };

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-paper px-6">
        <p className="text-sm font-semibold text-ink">Gebruiker niet gevonden</p>
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <ArrowLeft size={13} /> Terug
        </button>
      </div>
    );
  }

  // ── View-only ─────────────────────────────────────────────────────────────

  if (!isOwn) {
    return (
      <div className="min-h-[100dvh] bg-paper">
        <TopBar title={user.name} onBack={goBack} />
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
      <TopBar title={user.name} onBack={goBack} />

      <motion.div
        className="mx-auto max-w-3xl space-y-5 px-4 py-5 sm:px-6 sm:py-8"
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
          actions={
            <>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onAvatarFileChange}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`${routes.profile.view(decodedName)}?preview=1`)}
                className="hidden sm:flex"
              >
                <Pencil size={13} />
                Bekijk profiel
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                loading={updateMutation.isPending || renameMutation.isPending}
              >
                <Save size={13} />
                Opslaan
              </Button>
            </>
          }
        />

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
                className={`input-field ${nameError && draftName !== user.name ? "!border-rose-500 dark:!border-rose-400" : ""}`}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              {nameError && draftName !== user.name && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={11} /> {nameError}
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
                  maxLength={20}
                  className={`input-field pl-9 ${phoneError && draftPhone ? "!border-rose-500 dark:!border-rose-400" : ""}`}
                  placeholder="+31 6 12345678"
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                />
              </div>
              {phoneError && draftPhone && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={11} /> {phoneError}
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
                <span className="pointer-events-none absolute bottom-3 right-3 select-none font-mono text-[11px] text-ink-3">
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
                        className="text-ink-3 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <X size={11} />
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
              <ColorPicker
                value={draftColor}
                onChange={setDraftColor}
                presets={NAME_COLORS}
              />
              {draftColor && (
                <div className="mt-3 inline-flex items-center rounded-lg bg-sunken px-3 py-1.5">
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: draftColor,
                      fontFamily:
                        draftFont !== "default"
                          ? FONT_MAP[draftFont]
                          : undefined,
                    }}
                  >
                    {user.name}
                  </span>
                </div>
              )}
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
                        className={`font-mono text-[10px] uppercase tracking-[0.05em] ${isActive ? "text-ink" : "text-ink-3"}`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </Card>

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
          {/* ── Bannerkleur ──────────────────────────────────────────────── */}
          <Card title="Bannerkleur">
            {/* Live preview strip */}
            <div
              className="mb-4 h-14 w-full rounded-xl border-1.5 border-line"
              style={getBannerStyle(draftBanner)}
            />
            <ColorPicker
              value={draftBanner}
              onChange={setDraftBanner}
              presets={BANNER_COLORS}
              fallback="#1e293b"
            />
          </Card>

          {/* ── Banner afbeelding ────────────────────────────────────────── */}
          <Card title="Bannerafbeelding">
            {/* Hidden file input */}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={onBannerFileChange}
            />

            {user?.banner_url ? (
              <>
                {/* Preview */}
                <div
                  className="relative mb-3 overflow-hidden rounded-xl border-1.5 border-line"
                  style={{ aspectRatio: "3/1" }}
                >
                  <img
                    src={user.banner_url}
                    alt="Banner"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => bannerInputRef.current?.click()}
                    loading={uploadBannerMutation.isPending}
                  >
                    <Upload size={13} />
                    Wijzigen
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={onBannerDelete}
                    loading={deleteBannerMutation.isPending}
                  >
                    Verwijderen
                  </Button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="flex w-full flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-line py-7 transition-colors hover:border-ink-3 hover:bg-sunken"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadBannerMutation.isPending}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunken text-ink-3">
                  <Upload size={17} />
                </div>
                <div className="px-3 text-center">
                  <p className="text-sm font-semibold text-ink">
                    Klik om een afbeelding te uploaden
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-3">
                    JPEG · PNG · GIF · WebP · max 8 MB
                  </p>
                </div>
              </button>
            )}
          </Card>
        </div>

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
