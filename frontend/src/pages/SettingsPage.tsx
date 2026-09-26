import { useState } from "react";
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  QrCode,
  Bell,
  MessageSquare,
  Sun,
  Moon,
  Github,
  Youtube,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser, useUpdatePreferences } from "../hooks/useUsers";
import { useSmartBack } from "../hooks/useSmartBack";
import { useThemeStore } from "../store/theme.store";
import { startDiscordLink } from "../services/auth.service";
import { routes } from "../config/routes";
import { listContainer, listItem } from "../utils/motion";
import { toast } from "../store/toast.store";

const ROW =
  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken active:bg-sunken";
const PANEL = "card-surface overflow-hidden";
const PANEL_ROWS = "divide-y divide-line border-t border-line";
/** Flat top bar for the pages outside the app shell: back, title, and home on a fresh entry. */


function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-1.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 ${
        checked ? "border-outline bg-brand" : "border-line bg-sunken"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full transition-transform duration-200 ${
          checked ? "translate-x-[22px] bg-brand-on" : "translate-x-[3px] bg-ink-3"
        }`}
      />
    </button>
  );
}

/**
 * Instellingen, opened from the avatar menu: the one place for personal
 * settings — notifications, Discord, theme, greeting — plus sharing links
 * and the app version. Profile, changelog and logout live in the avatar menu.
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack(routes.hub);
  const [qrOpen, setQrOpen] = useState(false);
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const { data: me } = useCurrentUser();
  const updatePreferences = useUpdatePreferences();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  async function onLinkDiscord() {
    try {
      setLinkingDiscord(true);
      await startDiscordLink();
    } catch {
      setLinkingDiscord(false);
      toast("error", "Kon Discord-koppeling niet starten. Probeer het opnieuw.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-paper">
      <DetailTopbar title="Instellingen" onBack={goBack} width="2xl" />

      <motion.div
        className="mx-auto max-w-2xl space-y-5 px-4 py-6 md:py-10"
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
                <p className="text-[14px] font-semibold text-ink">Notificaties</p>
                <p className="text-[12.5px] text-ink-3">Kies welke Discord DM's je ontvangt</p>
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
          </div>
        </motion.section>

        {/* Weergave */}
        <motion.section variants={listItem} className={PANEL}>
          <p className="section-label px-4 pb-2.5 pt-3.5">Weergave</p>
          <div className={PANEL_ROWS}>
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                {isDark ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Donker thema</p>
                <p className="text-[12.5px] text-ink-3">Geldt voor dit apparaat</p>
              </div>
              <Switch checked={isDark} onChange={toggleTheme} label="Donker thema" />
            </div>

            {me && (
              <div className="flex w-full items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                  <Sun size={16} />
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

        {/* Delen & links */}
        <motion.section variants={listItem} className={PANEL}>
          <p className="section-label px-4 pb-2.5 pt-3.5">Delen &amp; links</p>
          <div className={PANEL_ROWS}>
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
                    <p className="text-[12.5px] text-ink-3">Scan om de app te openen</p>
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
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </a>

            <a href="https://www.youtube.com/@ankerd" target="_blank" rel="noopener noreferrer" className={ROW}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
                <Youtube size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">YouTube</p>
                <p className="text-[12.5px] text-ink-3">Bekijk het YouTube-kanaal</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </a>
          </div>
        </motion.section>

        {/* App */}
        <motion.section variants={listItem} className={PANEL}>
          <p className="section-label px-4 pb-2.5 pt-3.5">App</p>
          <div className={PANEL_ROWS}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border-1.5 border-line bg-white">
                <img src="/icons/icon-192.png" alt="Ankerd" className="h-6 w-6 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">Ankerd Con</p>
                <p className="text-[12.5px] text-ink-3">Event portal · v{__APP_VERSION__}</p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  Powered by{" "}
                  <a href="https://ayoublfatmi.nl" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink-2 hover:text-ink hover:underline">
                    ALFA
                  </a>
                  {" · "}
                  <a href="https://rg-digital.dev/" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink-2 hover:text-ink hover:underline">
                    RG Digital
                  </a>
                  {" · "}
                  <a href="https://ankerd.nl" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink-2 hover:text-ink hover:underline">
                    Ankerd
                  </a>
                </p>
              </div>
            </div>

          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
