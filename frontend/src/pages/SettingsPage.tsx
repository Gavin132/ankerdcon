import { Fragment, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  QrCode,
  Bell,
  MessageSquare,
  MessageSquareHeart,
  Sun,
  Hand,
  Moon,
  Github,
  Youtube,
  Instagram,
  Palette,
  Check,
  Rows3,
  Sparkles,
  Gauge,
  Download,
  UserX,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { FeedbackSheet } from "../components/settings/FeedbackSheet";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useUpdatePreferences } from "../hooks/useUsers";
import { useSmartBack } from "../hooks/useSmartBack";
import { ACCENTS, useThemeStore, type Density } from "../store/theme.store";
import { useDataSaverStore } from "../store/dataSaver.store";
import { startDiscordLink } from "../services/auth.service";
import { routes } from "../config/routes";
import { listContainer, listItem } from "../utils/motion";
import { toast } from "../store/toast.store";
import { InstallHint, useInstallKind } from "../components/common/InstallHint";
import { Switch } from "../components/common/Switch";
import { Button } from "../components/common/Button";
import { askConfirm } from "../store/confirm.store";
import { useLoginProviders } from "../hooks/useLoginProviders";
import { downloadMyData, requestAccountDeletion, unlinkDiscordAccount } from "../services/users.service";
import { QUERY_KEYS } from "../constants";
import { ApiError } from "../lib/api/client";

const ROW =
  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken active:bg-sunken";
const PANEL = "card-surface overflow-hidden";
const PANEL_ROWS = "divide-y divide-line border-t border-line";
/** Flat top bar for the pages outside the app shell: back, title, and home on a fresh entry. */


/**
 * Instellingen, opened from the avatar menu: the one place for personal
 * settings — notifications, Discord, theme, greeting — plus sharing links
 * and the app version with what is new. Profile and logout live in the avatar menu.
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack(routes.hub);
  const [qrOpen, setQrOpen] = useState(false);
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const providers = useLoginProviders(!!me?.discord_id);
  // Discord can only go while there is another way to sign in; the browser's login refuses the last one anyway.
  const canUnlinkDiscord = !!providers && providers.some((x) => x !== "discord");
  const [unlinking, setUnlinking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const installKind = useInstallKind();
  const updatePreferences = useUpdatePreferences();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);
  const density = useThemeStore((s) => s.density);
  const setDensity = useThemeStore((s) => s.setDensity);
  const dataSaver = useDataSaverStore((s) => s.on);
  const toggleDataSaver = useDataSaverStore((s) => s.toggle);

  const DENSITY_OPTIONS: { id: Density; label: string }[] = [
    { id: "comfortable", label: "Comfortabel" },
    { id: "compact", label: "Compact" },
  ];

  async function onLinkDiscord() {
    try {
      setLinkingDiscord(true);
      await startDiscordLink();
    } catch {
      setLinkingDiscord(false);
      toast("error", "Kon Discord-koppeling niet starten. Probeer het opnieuw.");
    }
  }

  async function onUnlinkDiscord() {
    const ok = await askConfirm({
      title: "Discord ontkoppelen?",
      message: "Je krijgt dan geen berichten meer van de Discord-bot. Inloggen kan nog met je andere account en je kunt Discord later opnieuw koppelen.",
      confirmLabel: "Ontkoppelen",
      cancelLabel: "Annuleren",
    });
    if (!ok) return;
    setUnlinking(true);
    try {
      await unlinkDiscordAccount();
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.currentUser });
      await qc.invalidateQueries({ queryKey: ["loginProviders"] });
      toast("success", "Discord is ontkoppeld.");
    } catch {
      toast("error", "Kon Discord niet ontkoppelen. Probeer het opnieuw.");
    } finally {
      setUnlinking(false);
    }
  }

  async function onDownloadData() {
    setExporting(true);
    try {
      await downloadMyData();
    } catch {
      toast("error", "Kon je gegevens niet downloaden. Probeer het opnieuw.");
    } finally {
      setExporting(false);
    }
  }

  async function onRequestDeletion() {
    const ok = await askConfirm({
      title: "Account laten verwijderen?",
      message: "De beheerders krijgen een melding en verwijderen je account en je gegevens. Dat gebeurt niet meteen. Je kunt eerst je gegevens downloaden.",
      confirmLabel: "Verzoek versturen",
      cancelLabel: "Annuleren",
    });
    if (!ok) return;
    setRequestingDeletion(true);
    try {
      await requestAccountDeletion();
      toast("success", "Je verzoek is verstuurd. Een beheerder neemt contact op.");
    } catch (e) {
      toast("error", e instanceof ApiError && e.status === 429 ? "Je verzoek is al verstuurd. Een beheerder neemt contact op." : "Kon je verzoek niet versturen. Probeer het opnieuw.");
    } finally {
      setRequestingDeletion(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-paper">
      <DetailTopbar title="Instellingen" onBack={goBack} width="2xl" />

      <motion.div
        className="mx-auto max-w-2xl space-y-5 px-4 py-5 sm:py-8"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {/* Account */}
        <motion.section variants={listItem} className={PANEL}>
          <p className="section-label px-4 pb-2.5 pt-3.5">Account</p>
          <div className={PANEL_ROWS}>
            <button onClick={() => navigate(routes.notifications)} className={ROW}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Bell size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Meldingen</p>
                <p className="text-[12.5px] text-ink-3">Kies hoe je meldingen krijgt, via Discord of push, en waarvoor</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </button>

            {me && !me.discord_id && (
              <button onClick={onLinkDiscord} disabled={linkingDiscord} className={`${ROW} disabled:opacity-60`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                  <MessageSquare size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink">
                    {linkingDiscord ? "Bezig met koppelen…" : "Discord koppelen"}
                  </p>
                  <p className="text-[12.5px] text-ink-3">Nodig om Discord-DM's van de bot te kunnen ontvangen</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-3" />
              </button>
            )}
            {me?.discord_id && (
              <div className="flex w-full items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                  <MessageSquare size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink">Discord gekoppeld</p>
                  <p className="truncate text-[12.5px] text-ink-3">
                    {me.discord_username ? `@${me.discord_username}` : "Je Discord-account"}
                    {providers && !canUnlinkDiscord ? " · je logt alleen met Discord in" : ""}
                  </p>
                </div>
                {canUnlinkDiscord && (
                  <Button size="sm" variant="secondary" onClick={onUnlinkDiscord} loading={unlinking}>
                    Ontkoppelen
                  </Button>
                )}
              </div>
            )}
            {me && (
              <div className="flex w-full items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                  <Hand size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink">Begroeting tonen</p>
                  <p className="text-[12.5px] text-ink-3">"Goedemiddag, {me.name}" bovenaan de Hub</p>
                </div>
                <Switch
                  checked={me.show_greeting !== false}
                  disabled={updatePreferences.isPending}
                  label="Begroeting tonen"
                  onChange={() =>
                    updatePreferences.mutateAsync({ show_greeting: !(me.show_greeting !== false) }).catch(() =>
                      toast("error", "Kon voorkeur niet opslaan."),
                    )
                  }
                />
              </div>
            )}
          </div>
        </motion.section>

        {/* App installeren: only on a phone that has not done so yet */}
        {installKind && (
          <motion.div variants={listItem}>
            <InstallHint kind={installKind} />
          </motion.div>
        )}

        {/* Weergave */}
        <motion.section variants={listItem} className={PANEL}>
          <p className="section-label px-4 pt-3.5">Weergave</p>
          <p className="px-4 pb-2.5 pt-0.5 text-[12.5px] text-ink-3">Voor dit apparaat</p>
          <div className={PANEL_ROWS}>
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                {isDark ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Donker thema</p>
              </div>
              <Switch checked={isDark} onChange={toggleTheme} label="Donker thema" />
            </div>

            {!__DEV_BUILD__ && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                  <Palette size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink">Accentkleur</p>
                  </div>
              </div>
              <div className="mt-3 grid w-fit grid-cols-4 gap-2.5 pl-11 min-[430px]:grid-cols-7" role="radiogroup" aria-label="Accentkleur">
                {ACCENTS.map((a) => {
                  const selected = accent === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={a.label}
                      title={a.label}
                      onClick={() => setAccent(a.id)}
                      style={{ backgroundColor: a.swatch }}
                      className={`hit-area flex h-9 w-9 items-center justify-center rounded-full text-brand-on transition-colors ${
                        selected ? "border-1.5 border-outline" : "border-1.5 border-line"
                      }`}
                    >
                      {selected && <Check size={16} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                  <Rows3 size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink">Dichtheid</p>
                  </div>
              </div>
              <div className="mt-3 flex gap-2 pl-11" role="radiogroup" aria-label="Dichtheid">
                {DENSITY_OPTIONS.map((o) => {
                  const selected = density === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setDensity(o.id)}
                      className={`chip ${selected ? "chip-on" : "chip-off"}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex w-full items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Gauge size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Databesparing</p>
                <p className="text-[12.5px] text-ink-3">Een story laadt niets vooruit en een video pas als je op afspelen tikt</p>
              </div>
              <Switch checked={dataSaver} onChange={toggleDataSaver} label="Databesparing" />
            </div>
          </div>
        </motion.section>

        {/* Mijn gegevens */}
        <motion.section variants={listItem} className={PANEL}>
          <p className="section-label px-4 pb-2.5 pt-3.5">Mijn gegevens</p>
          <div className={PANEL_ROWS}>
            <button onClick={onDownloadData} disabled={exporting} className={`${ROW} disabled:opacity-60`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Download size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">{exporting ? "Bezig met downloaden…" : "Mijn gegevens downloaden"}</p>
                <p className="text-[12.5px] text-ink-3">Alles wat de app over jou bewaart, als bestand</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </button>

            <button onClick={onRequestDeletion} disabled={requestingDeletion} className={`${ROW} disabled:opacity-60`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bad-soft text-bad">
                <UserX size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-bad">Account laten verwijderen</p>
                <p className="text-[12.5px] text-ink-3">De beheerders verwijderen je account en je gegevens</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </button>
          </div>
        </motion.section>

        {/* Delen & links */}
        <motion.section variants={listItem} className={PANEL}>
          <p className="section-label px-4 pb-2.5 pt-3.5">Delen &amp; links</p>
          <div className={PANEL_ROWS}>
            <a href="https://www.youtube.com/@ankerd" target="_blank" rel="noopener noreferrer" className={ROW}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Youtube size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">YouTube</p>
                <p className="text-[12.5px] text-ink-3">Bekijk het YouTube-kanaal</p>
              </div>
              <ExternalLink size={14} className="shrink-0 text-ink-3" />
            </a>

            <a href="https://www.instagram.com/ankerd_official/" target="_blank" rel="noopener noreferrer" className={ROW}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Instagram size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Instagram</p>
                <p className="text-[12.5px] text-ink-3">Volg Ankerd op Instagram</p>
              </div>
              <ExternalLink size={14} className="shrink-0 text-ink-3" />
            </a>

            <button onClick={() => setQrOpen((v) => !v)} aria-expanded={qrOpen} className={ROW}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <QrCode size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Deel via QR-code</p>
                <p className="text-[12.5px] text-ink-3">Scan om de app te openen</p>
              </div>
              <motion.div animate={{ rotate: qrOpen ? 90 : 0 }} transition={{ duration: 0.18 }}>
                <ChevronRight size={16} className="shrink-0 text-ink-3" />
              </motion.div>
            </button>

            <AnimatePresence>
              {qrOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-5 pt-1 flex flex-col items-center gap-3">
                    <div className="rounded-xl border-1.5 border-line bg-white p-3">
                      <QRCodeSVG value={window.location.origin} size={160} bgColor="#ffffff" fgColor="#0F1519" level="M" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <a href="https://github.com/Gavin132/ankerdcon" target="_blank" rel="noopener noreferrer" className={ROW}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Github size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Broncode</p>
                <p className="text-[12.5px] text-ink-3">Bekijk de repository op GitHub</p>
              </div>
              <ExternalLink size={14} className="shrink-0 text-ink-3" />
            </a>
          </div>
        </motion.section>

        {/* App */}
        <motion.section variants={listItem} className={PANEL}>
          <p className="section-label px-4 pb-2.5 pt-3.5">App</p>
          <div className={PANEL_ROWS}>
            <button onClick={() => setFeedbackOpen(true)} className={ROW}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <MessageSquareHeart size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Feedback geven</p>
                <p className="text-[12.5px] text-ink-3">Een bug, idee of iets anders, ook anoniem</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </button>

            <button onClick={() => navigate(routes.changelog)} className={ROW}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Sparkles size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Wat is nieuw</p>
                <p className="text-[12.5px] text-ink-3">Wat er in de app is veranderd</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </button>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border-1.5 border-line bg-white">
                <img src="/icons/icon-192.png" alt="Ankerd" className="h-6 w-6 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Ankerd Con</p>
                <p className="text-[12.5px] text-ink-3">Ledenportaal · v{__APP_VERSION__}</p>
                <p className="-ml-1.5 flex flex-nowrap items-center whitespace-nowrap text-[12px] text-ink-3">
                  <span className="pl-1.5">Powered by</span>
                  {[
                    ["ALFA", "https://ayoublfatmi.nl"],
                    ["RG Digital", "https://rg-digital.dev/"],
                    ["Ankerd", "https://ankerd.nl"],
                  ].map(([name, href], i) => (
                    <Fragment key={name}>
                      {i > 0 && <span aria-hidden>·</span>}
                      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center px-1.5 font-semibold text-ink-2 hover:text-ink hover:underline">
                        {name}
                      </a>
                    </Fragment>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </motion.div>

      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
