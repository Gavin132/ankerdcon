import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, BedDouble, Phone, MapPin } from "lucide-react";
import { Button } from "../components/common/Button";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { LocationPingDisplay } from "../components/common/LocationPingDisplay";
import { useUsers, useUpdatePreferences } from "../hooks/useUsers";
import { useAuthStore } from "../store/auth.store";
import { avatarColor } from "../utils/avatar";
import { toast } from "../store/toast.store";
import type { FontOption, User } from "../types";

// ─── constants ────────────────────────────────────────────────────────────────

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

const COLOR_PRESETS = [
  "#e2e8f0", "#0ea5e9", "#8b5cf6", "#10b981",
  "#f43f5e", "#f59e0b", "#6366f1", "#ec4899",
  "#14b8a6", "#fb923c", "#a3e635", "#38bdf8",
];

const BANNER_PRESETS = [
  "#0f172a", "#1e293b", "#1a1a2e", "#2d1b69",
  "#1a2e1a", "#2e1a1a", "#0369a1", "#292524",
  "#064e3b", "#16213e", "#4c0519", "#0a0a1a",
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function getBannerStyle(bannerColor: string, nameColor: string): React.CSSProperties {
  if (bannerColor) return { backgroundColor: bannerColor };
  if (nameColor) return { backgroundColor: nameColor };
  return { background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)" };
}

// ─── ColorSwatches ────────────────────────────────────────────────────────────

interface ColorSwatchesProps {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  resetTitle: string;
  pickerFallback: string;
}

function ColorSwatches({ value, onChange, presets, resetTitle, pickerFallback }: ColorSwatchesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Reset / auto */}
      <button
        type="button"
        onClick={() => onChange("")}
        title={resetTitle}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all duration-150 hover:scale-110 ${
          value === ""
            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30"
            : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-slate-300"
        }`}
      >
        <X size={12} className={value === "" ? "text-sky-500" : "text-slate-400"} />
      </button>

      {/* Presets */}
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`relative h-9 w-9 rounded-xl border-2 transition-all duration-150 hover:scale-110 hover:shadow-md ${
            value === c ? "border-sky-500 shadow-md scale-105" : "border-transparent shadow-sm"
          }`}
          style={{ backgroundColor: c }}
        >
          {value === c && (
            <Check
              size={12}
              className="absolute inset-0 m-auto text-white drop-shadow"
            />
          )}
        </button>
      ))}

      {/* Custom color picker — shown as a rainbow gradient tile */}
      <div className="relative h-9 w-9">
        <input
          type="color"
          value={value || pickerFallback}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer rounded-xl opacity-0 z-10"
          title="Aangepaste kleur"
        />
        <div className="h-9 w-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-[conic-gradient(from_0deg,#f43f5e,#f59e0b,#a3e635,#0ea5e9,#8b5cf6,#f43f5e)] shadow-sm flex items-center justify-center">
          <span className="text-[11px] font-black text-white drop-shadow-sm">+</span>
        </div>
      </div>
    </div>
  );
}

// ─── PreviewCard ──────────────────────────────────────────────────────────────

interface PreviewCardProps {
  user: User;
  bannerStyle: React.CSSProperties;
  displayColor: string;
  displayBio: string;
  displayPronouns: string;
  nameStyle: React.CSSProperties;
}

function PreviewCard({ user, bannerStyle, displayColor, displayBio, displayPronouns, nameStyle }: PreviewCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}
    >
      {/* Banner — 110px */}
      <div className="relative h-[110px]" style={bannerStyle}>
        {/* Subtle inner shadow at bottom for depth */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-[#1e293b] border-t-0 px-4 pb-5">
        {/* Avatar — 72px, -mt-9 = exactly half overlap (36px) */}
        <div className="-mt-9 mb-2.5">
          <div
            className={`relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border-[5px] border-white dark:border-[#1e293b] bg-gradient-to-br text-2xl font-black text-white ${avatarColor(user.name)}`}
            style={{
              boxShadow: "0 8px 28px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)",
              ...(displayColor ? { backgroundColor: displayColor, backgroundImage: "none" } : {}),
            }}
          >
            {user.name[0].toUpperCase()}
          </div>
        </div>

        {/* Name */}
        <p
          className="text-[17px] font-black text-slate-900 dark:text-white leading-tight"
          style={nameStyle}
        >
          {user.name}
        </p>
        {displayPronouns && (
          <p className="mt-0.5 text-[11px] text-slate-400 font-medium">{displayPronouns}</p>
        )}

        {/* Bio */}
        {displayBio && (
          <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 px-3.5 py-2.5">
            <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              {displayBio}
            </p>
          </div>
        )}

        {/* Info */}
        {(user.hotel_room || user.phone_number || user.live_location_ping) && (
          <div className={`space-y-2 ${displayBio ? "mt-3" : "mt-4"}`}>
            <p className="section-label">Info</p>
            <div className="space-y-1.5">
              {user.hotel_room && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                    <BedDouble size={11} className="text-slate-400" />
                  </div>
                  <span className="text-[12.5px] text-slate-500 dark:text-slate-400">
                    Kamer {user.hotel_room}
                  </span>
                </div>
              )}
              {user.phone_number && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                    <Phone size={11} className="text-slate-400" />
                  </div>
                  <a href={`tel:${user.phone_number}`} className="text-[12.5px] text-sky-500">
                    {user.phone_number}
                  </a>
                </div>
              )}
              {user.live_location_ping && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-900/30">
                    <MapPin size={11} className="text-emerald-500" />
                  </div>
                  <LocationPingDisplay raw={user.live_location_ping} align="start" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 p-5 shadow-sm mb-3 ${className}`}
    >
      <p className="section-label mb-4">{title}</p>
      {children}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function ProfilePage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { data: users, isLoading } = useUsers();
  const updateMutation = useUpdatePreferences();

  const decodedName = name ? decodeURIComponent(name) : "";
  const user = users?.find((u) => u.name === decodedName);
  const isOwn = currentUser === decodedName;

  const [draftBio, setDraftBio] = useState("");
  const [draftColor, setDraftColor] = useState("");
  const [draftBanner, setDraftBanner] = useState("");
  const [draftFont, setDraftFont] = useState<FontOption>("default");
  const [draftPronouns, setDraftPronouns] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      setDraftBio(user.bio || "");
      setDraftColor(user.color || "");
      setDraftBanner(user.banner_color || "");
      setDraftFont((user.font as FontOption) || "default");
      setDraftPronouns(user.pronouns || "");
      setInitialized(true);
    }
  }, [user, initialized]);

  async function onSave() {
    try {
      await updateMutation.mutateAsync({
        bio: draftBio,
        color: draftColor || "",
        font: draftFont,
        banner_color: draftBanner,
        pronouns: draftPronouns,
      });
      toast("success", "Profiel opgeslagen!");
    } catch {
      toast("error", "Kon profiel niet opslaan.");
    }
  }

  const displayBanner = isOwn ? draftBanner : user?.banner_color || "";
  const displayColor = isOwn ? draftColor : user?.color || "";
  const displayFont = isOwn ? draftFont : ((user?.font as FontOption) || "default");
  const displayBio = isOwn ? draftBio : user?.bio || "";
  const displayPronouns = isOwn ? draftPronouns : user?.pronouns || "";

  const bannerStyle = getBannerStyle(displayBanner, displayColor);
  const nameStyle: React.CSSProperties = {
    color: displayColor || undefined,
    fontFamily:
      displayFont && displayFont !== "default" ? FONT_MAP[displayFont] : undefined,
  };

  // ── loading / not-found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#0f172a]">
        <p className="text-sm text-slate-400">Gebruiker niet gevonden</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={13} />
          Terug
        </button>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a]">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
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
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
            {isOwn ? "Profiel" : user.name}
          </p>
          {isOwn && (
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">
              Pas je profiel aan
            </p>
          )}
        </div>
      </div>

      {isOwn ? (
        /* ── Edit layout ─────────────────────────────────────────────────── */
        <div
          className="mx-auto max-w-5xl px-4 sm:px-8 py-6"
          style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-10 lg:items-start">

            {/* ── LEFT — form ─────────────────────────────────────────────── */}
            <div>
              {/* Mobile preview (hidden on desktop) */}
              <div className="lg:hidden mb-5">
                <p className="section-label mb-3">Voorbeeld</p>
                <PreviewCard
                  user={user}
                  bannerStyle={bannerStyle}
                  displayColor={displayColor}
                  displayBio={displayBio}
                  displayPronouns={displayPronouns}
                  nameStyle={nameStyle}
                />
              </div>

              {/* Weergavenaam */}
              <Section title="Weergavenaam">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm text-slate-400 dark:text-slate-500 select-none">
                  {user.name}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Je naam is ingesteld door de beheerder.
                </p>
              </Section>

              {/* Voornaamwoorden */}
              <Section title="Voornaamwoorden">
                <input
                  type="text"
                  maxLength={40}
                  className="input-field"
                  placeholder="bijv. hij/hem, zij/haar, die/hen"
                  value={draftPronouns}
                  onChange={(e) => setDraftPronouns(e.target.value)}
                />
                <p className="mt-2 text-xs text-slate-400">
                  Zichtbaar voor andere leden op je profielkaart.
                </p>
              </Section>

              {/* Avatar kleur */}
              <Section title="Avatarkleur">
                <div className="flex items-start gap-5">
                  {/* Live avatar preview */}
                  <div
                    className={`shrink-0 flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-black text-white shadow-md ${avatarColor(user.name)}`}
                    style={
                      draftColor
                        ? { backgroundColor: draftColor, backgroundImage: "none" }
                        : undefined
                    }
                  >
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                      Kies een kleur voor je avatar en gebruikersnaam
                    </p>
                    <ColorSwatches
                      value={draftColor}
                      onChange={setDraftColor}
                      presets={COLOR_PRESETS}
                      resetTitle="Standaard (gradient)"
                      pickerFallback="#e2e8f0"
                    />
                  </div>
                </div>
              </Section>

              {/* Banner kleur */}
              <Section title="Bannerkleur">
                {/* Live banner strip with avatar overlay for context */}
                <div className="relative mb-4 h-[60px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                  <div className="absolute inset-0" style={getBannerStyle(draftBanner, draftColor)} />
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
                <ColorSwatches
                  value={draftBanner}
                  onChange={setDraftBanner}
                  presets={BANNER_PRESETS}
                  resetTitle="Automatisch (kleurverloop)"
                  pickerFallback="#1e293b"
                />
              </Section>

              {/* Bio */}
              <Section title="Bio">
                <div className="relative">
                  <textarea
                    rows={4}
                    maxLength={200}
                    className="input-field resize-none"
                    placeholder="Vertel iets over jezelf…"
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                  />
                  <span className="absolute bottom-3 right-3 text-[11px] text-slate-300 dark:text-slate-600 select-none">
                    {200 - draftBio.length}
                  </span>
                </div>
              </Section>

              {/* Lettertype */}
              <Section title="Lettertype" className="mb-6">
                <div className="grid grid-cols-5 gap-2">
                  {FONT_OPTIONS.map(({ value, label }) => {
                    const fontFamily = value !== "default" ? FONT_MAP[value] : undefined;
                    const isActive = draftFont === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDraftFont(value)}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 py-3 px-2 text-center transition-all duration-150 hover:scale-105 ${
                          isActive
                            ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600"
                        }`}
                      >
                        <span
                          className={`block text-[20px] font-bold leading-none mb-1.5 ${
                            isActive
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                          style={{ fontFamily }}
                        >
                          Aa
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wide ${
                            isActive ? "text-sky-500" : "text-slate-400"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Save button */}
              <Button
                onClick={onSave}
                loading={updateMutation.isPending}
                className="w-full sm:w-auto"
              >
                Wijzigingen opslaan
              </Button>
            </div>

            {/* ── RIGHT — sticky live preview (desktop only) ─────────────── */}
            <div className="hidden lg:block sticky top-[68px]">
              <p className="section-label mb-3">Live voorbeeld</p>
              <PreviewCard
                user={user}
                bannerStyle={bannerStyle}
                displayColor={displayColor}
                displayBio={displayBio}
                displayPronouns={displayPronouns}
                nameStyle={nameStyle}
              />
              <p className="mt-3 text-center text-[11px] text-slate-300 dark:text-slate-600">
                Wijzigingen zijn direct zichtbaar
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ── View-only layout ────────────────────────────────────────────── */
        <div
          className="mx-auto max-w-sm px-4 py-6"
          style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <PreviewCard
            user={user}
            bannerStyle={bannerStyle}
            displayColor={displayColor}
            displayBio={displayBio}
            displayPronouns={displayPronouns}
            nameStyle={nameStyle}
          />

          <div className="mt-3 space-y-2">
            {user.live_location_ping && (
              <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700 px-4 py-3 shadow-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                  <MapPin size={13} className="text-emerald-500" />
                </div>
                <LocationPingDisplay raw={user.live_location_ping} />
              </div>
            )}
            {user.phone_number && (
              <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700 px-4 py-3 shadow-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
                  <Phone size={13} className="text-sky-500" />
                </div>
                <a href={`tel:${user.phone_number}`} className="text-sm text-sky-500 font-medium">
                  {user.phone_number}
                </a>
              </div>
            )}
            {user.hotel_room && (
              <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700 px-4 py-3 shadow-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <BedDouble size={13} className="text-slate-400" />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Kamer {user.hotel_room}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
