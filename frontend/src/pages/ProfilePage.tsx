import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { routes } from "../config/routes";
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  BedDouble,
  Phone,
  MapPin,
  Upload,
  Pencil,
  Save,
  Smartphone,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { LocationPingDisplay } from "../components/common/LocationPingDisplay";
import {
  useUser,
  useUpdatePreferences,
  useUpdateName,
  useUploadBanner,
  useDeleteBanner,
} from "../hooks/useUsers";
import { BannerCropModal } from "../components/profile/BannerCropModal";
import { useAuthStore } from "../store/auth.store";
import { avatarColor } from "../utils/avatar";
import { toast } from "../store/toast.store";
import { validateDisplayName, validatePhoneNumber } from "../utils/validation";
import type { FontOption, User } from "../types";

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
): React.CSSProperties {
  if (bannerUrl)
    return {
      backgroundImage: `url(${bannerUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  if (bannerColor) return { backgroundColor: bannerColor };
  return { background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" };
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
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      )}
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
    <div className="flex flex-wrap gap-2 items-center">
      <button
        type="button"
        onClick={() => onChange("")}
        className={`h-7 w-7 rounded-full transition-all hover:scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${
          value === "" ? "ring-sky-500" : "ring-transparent"
        }`}
        style={{ background: "linear-gradient(135deg, #cbd5e1, #94a3b8)" }}
        title="Automatisch"
      >
        {value === "" && (
          <Check size={10} className="m-auto text-white drop-shadow" />
        )}
      </button>

      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? "" : c)}
          className={`h-7 w-7 rounded-full transition-all hover:scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${
            value === c ? "ring-sky-500 scale-110" : "ring-transparent"
          }`}
          style={{ backgroundColor: c }}
          title={c}
        >
          {value === c && (
            <Check size={10} className="m-auto text-white drop-shadow" />
          )}
        </button>
      ))}

      <div className="relative h-7 w-7">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rounded-full"
          title="Aangepaste kleur"
        />
        <div className="h-7 w-7 rounded-full bg-[conic-gradient(from_0deg,#f43f5e,#f59e0b,#84cc16,#0ea5e9,#8b5cf6,#f43f5e)] flex items-center justify-center shadow-sm">
          <span className="text-[9px] font-black text-white drop-shadow leading-none">
            +
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

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
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm ${className}`}
    >
      {title && (
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── View-only profile card ───────────────────────────────────────────────────

function ViewProfile({
  user,
  displayColor,
  displayBio,
  displayPronouns,
  bannerStyle,
  nameStyle,
}: {
  user: User;
  displayColor: string;
  displayBio: string;
  displayPronouns: string;
  bannerStyle: React.CSSProperties;
  nameStyle: React.CSSProperties;
}) {
  const [imgErr, setImgErr] = useState(false);
  const hasAvatar = !!user.avatar_url && !imgErr;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="h-[120px]" style={bannerStyle} />

      {/* Avatar + name */}
      <div className="px-6 pb-6 -mt-10">
        <div
          className={`h-[76px] w-[76px] rounded-full border-4 border-white dark:border-slate-900 overflow-hidden mb-3 shadow-lg ${
            !hasAvatar
              ? `bg-gradient-to-br ${avatarColor(user.name)} flex items-center justify-center`
              : ""
          }`}
          style={
            !hasAvatar && displayColor
              ? {
                  backgroundColor: displayColor,
                  backgroundImage: "none",
                  borderColor: undefined,
                }
              : undefined
          }
        >
          {hasAvatar ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="h-full w-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <span className="text-2xl font-black text-white m-auto block text-center leading-[76px]">
              {user.name[0].toUpperCase()}
            </span>
          )}
        </div>

        <p
          className="text-xl font-black text-slate-900 dark:text-white"
          style={nameStyle}
        >
          {user.name}
        </p>
        {displayPronouns && (
          <p className="text-sm text-slate-400 mt-0.5">{displayPronouns}</p>
        )}

        {displayBio && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
            {displayBio}
          </p>
        )}

        {(user.hotel_room || user.phone_number || user.live_location_ping) && (
          <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            {user.hotel_room && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <BedDouble size={14} className="text-slate-400 shrink-0" />
                Kamer {user.hotel_room}
              </div>
            )}
            {user.phone_number && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-sky-500 shrink-0" />
                <a href={`tel:${user.phone_number}`} className="text-sky-500">
                  {user.phone_number}
                </a>
              </div>
            )}
            {user.live_location_ping && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <MapPin size={14} className="text-emerald-500 shrink-0" />
                <LocationPingDisplay
                  raw={user.live_location_ping}
                  align="start"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = name ? decodeURIComponent(name) : "";
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);

  const { data: user, isLoading } = useUser(decodedName);
  const updateMutation = useUpdatePreferences();
  const renameMutation = useUpdateName();
  const uploadBannerMutation = useUploadBanner();
  const deleteBannerMutation = useDeleteBanner();

  const isOwn = currentUser === decodedName;

  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftColor, setDraftColor] = useState("");
  const [draftBanner, setDraftBanner] = useState("");
  const [draftFont, setDraftFont] = useState<FontOption>("default");
  const [draftPronouns, setDraftPronouns] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [avatarImgErr, setAvatarImgErr] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const hasAvatar = !!user?.avatar_url && !avatarImgErr;

  const nameError = validateDisplayName(draftName);
  const phoneError = validatePhoneNumber(draftPhone);

  useEffect(() => {
    if (user && !initialized) {
      setDraftName(user.name);
      setDraftBio(user.bio || "");
      setDraftColor(user.color || "");
      setDraftBanner(user.banner_color || "");
      setDraftFont((user.font as FontOption) || "default");
      setDraftPronouns(user.pronouns || "");
      setDraftPhone(user.phone_number || "");
      setInitialized(true);
    }
  }, [user, initialized]);

  async function onRename() {
    const trimmed = draftName.trim();
    if (!trimmed || nameError || trimmed === user?.name) return;
    try {
      await renameMutation.mutateAsync({ new_name: trimmed });
      toast("success", `Naam gewijzigd naar "${trimmed}".`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      toast("error", msg ?? "Kon naam niet wijzigen.");
    }
  }

  function onBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setCropFile(f);
    setCropOpen(true);
  }

  async function onBannerConfirm(blob: Blob, isGif: boolean) {
    setCropOpen(false);
    try {
      await uploadBannerMutation.mutateAsync({
        blob,
        mimeType: isGif ? "image/gif" : "image/jpeg",
      });
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

  async function onSave() {
    if (phoneError) {
      toast("error", phoneError);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        bio: draftBio,
        color: draftColor || "",
        font: draftFont,
        banner_color: draftBanner,
        pronouns: draftPronouns,
        phone_number: draftPhone || "",
      });
      toast("success", "Profiel opgeslagen!");
    } catch {
      toast("error", "Kon profiel niet opslaan.");
    }
  }

  const displayBanner = isOwn ? draftBanner : user?.banner_color || "";
  const displayColor = isOwn ? draftColor : user?.color || "";
  const displayFont = isOwn
    ? draftFont
    : (user?.font as FontOption) || "default";
  const displayBio = isOwn ? draftBio : user?.bio || "";
  const displayPronouns = isOwn ? draftPronouns : user?.pronouns || "";

  const bannerStyle = getBannerStyle(
    displayBanner,
    user?.banner_url ?? undefined,
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-400">Gebruiker niet gevonden</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={13} /> Terug
        </button>
      </div>
    );
  }

  // ── View-only ─────────────────────────────────────────────────────────────

  if (!isOwn) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800"
          style={{
            paddingTop: "max(0.875rem, env(safe-area-inset-top, 0px))",
            paddingBottom: "0.875rem",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={17} />
          </button>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {user.name}
          </p>
        </div>
        <div
          className="mx-auto max-w-sm px-4 py-6"
          style={{
            paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ViewProfile
              user={user}
              bannerStyle={bannerStyle}
              displayColor={displayColor}
              displayBio={displayBio}
              displayPronouns={displayPronouns}
              nameStyle={nameStyle}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Edit layout ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      {/* ── Profile header ─────────────────────────────────────────────── */}
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Back button overlay */}
        <div
          className="absolute top-0 left-0 z-10 flex items-center gap-2 px-4"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/20 hover:bg-black/35 text-white backdrop-blur-sm transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
        </div>

        {/* Banner */}
        <div
          className="relative h-[200px] sm:h-[300px] w-full"
          style={bannerStyle}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Avatar + name + action row */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="mx-auto max-w-4xl px-5 sm:px-8 pb-5">
            {/* Avatar — overlaps the banner bottom edge */}
            <div className="-mt-[44px]">
              <div className="relative inline-block">
                <div
                  className={`h-[88px] w-[88px] rounded-full border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden ${
                    !hasAvatar
                      ? `bg-gradient-to-br ${avatarColor(user.name)} flex items-center justify-center`
                      : ""
                  }`}
                  style={
                    !hasAvatar && draftColor
                      ? { backgroundColor: draftColor, backgroundImage: "none" }
                      : undefined
                  }
                >
                  {hasAvatar ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarImgErr(true)}
                    />
                  ) : (
                    <span className="text-3xl font-black text-white">
                      {user.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Discord avatar badge */}
                {hasAvatar && (
                  <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 border-2 border-white dark:border-slate-900 shadow-sm">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.033.056a19.91 19.91 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Name + pronouns + action buttons — clearly in white area */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1
                  className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate"
                  style={nameStyle}
                >
                  {user.name}
                </h1>
                {draftPronouns && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                    {draftPronouns}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(routes.profile.view(decodedName))}
                  className="hidden sm:flex"
                >
                  <Pencil size={13} />
                  Bekijk profiel
                </Button>
                <Button
                  size="sm"
                  onClick={onSave}
                  loading={updateMutation.isPending}
                >
                  <Save size={13} />
                  Opslaan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <div
        className="mx-auto max-w-4xl px-5 sm:px-8 py-6 space-y-5"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
          {/* LEFT column */}
          <div className="space-y-5">
            {/* ── Persoonlijke info ──────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <Card
                title="Persoonlijke info"
                subtitle="Pas hier je persoonlijke gegevens aan."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Naam */}
                  <Field
                    label="Weergavenaam"
                    hint="Historische data blijft onder de oude naam staan."
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={30}
                        className={`input-field flex-1 ${nameError && draftName !== user.name ? "border-rose-400 dark:border-rose-700" : ""}`}
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                      />
                      <button
                        onClick={onRename}
                        disabled={
                          !draftName.trim() ||
                          !!nameError ||
                          draftName.trim() === user.name ||
                          renameMutation.isPending
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white disabled:opacity-30 hover:bg-sky-600 transition-colors"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                    {nameError && draftName !== user.name && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
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
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="tel"
                        maxLength={20}
                        className={`input-field pl-9 ${phoneError && draftPhone ? "border-rose-400 dark:border-rose-700" : ""}`}
                        placeholder="+31 6 12345678"
                        value={draftPhone}
                        onChange={(e) => setDraftPhone(e.target.value)}
                      />
                    </div>
                    {phoneError && draftPhone && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
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
                      <span className="absolute bottom-3 right-3 text-[11px] text-slate-300 dark:text-slate-600 pointer-events-none select-none">
                        {200 - draftBio.length}
                      </span>
                    </div>
                  </Field>
                </div>
              </Card>
            </motion.div>

            {/* ── Weergave ───────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
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
                      <div className="mt-2.5 inline-flex items-center rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5">
                        <span
                          className="text-sm font-black"
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
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {FONT_OPTIONS.map(({ value, label }) => {
                        const isActive = draftFont === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setDraftFont(value)}
                            className={`rounded-xl border-2 py-3 px-1.5 text-center transition-all ${
                              isActive
                                ? "border-sky-400 bg-sky-50 dark:bg-sky-500/10 dark:border-sky-500"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            <span
                              className={`block text-lg font-bold mb-1 ${isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-600 dark:text-slate-300"}`}
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
                              className={`text-[9px] font-bold uppercase tracking-wide ${isActive ? "text-sky-500" : "text-slate-400"}`}
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
            </motion.div>
          </div>

          {/* RIGHT column */}
          <div className="space-y-5">
            {/* ── Bannerkleur ────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
            >
              <Card title="Bannerkleur">
                {/* Live preview strip */}
                <div
                  className="h-14 w-full rounded-xl mb-4 border border-slate-100 dark:border-slate-800"
                  style={getBannerStyle(draftBanner)}
                />
                <ColorPicker
                  value={draftBanner}
                  onChange={setDraftBanner}
                  presets={BANNER_COLORS}
                  fallback="#1e293b"
                />
              </Card>
            </motion.div>

            {/* ── Banner afbeelding ───────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.16 }}
            >
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
                      className="relative overflow-hidden rounded-xl mb-3 border border-slate-100 dark:border-slate-800"
                      style={{ aspectRatio: "3/1" }}
                    >
                      <img
                        src={user.banner_url}
                        alt="Banner"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
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
                    className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-7 gap-2.5 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/40 dark:hover:bg-sky-900/10 transition-colors"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadBannerMutation.isPending}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <Upload size={16} className="text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Klik om een afbeelding te uploaden
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">
                        JPEG · PNG · GIF · WebP · max 8 MB
                      </p>
                    </div>
                  </button>
                )}
              </Card>
            </motion.div>

            {/* ── Avatar info ────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.18 }}
            >
              <Card title="Avatar">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-14 w-14 shrink-0 rounded-full border-2 border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm ${
                      !hasAvatar
                        ? `bg-gradient-to-br ${avatarColor(user.name)} flex items-center justify-center`
                        : ""
                    }`}
                    style={
                      !hasAvatar && draftColor
                        ? {
                            backgroundColor: draftColor,
                            backgroundImage: "none",
                          }
                        : undefined
                    }
                  >
                    {hasAvatar ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-black text-white">
                        {user.name[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {hasAvatar ? "Discord avatar" : "Gegenereerde avatar"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {hasAvatar
                        ? "Gesynchroniseerd via Discord OAuth"
                        : "Log in met Discord voor je eigen avatar"}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <BannerCropModal
        open={cropOpen}
        file={cropFile}
        onClose={() => setCropOpen(false)}
        onConfirm={onBannerConfirm}
      />
    </div>
  );
}
