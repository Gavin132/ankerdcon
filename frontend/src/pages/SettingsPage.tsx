import { useState } from "react";
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
import { DetailTopbar } from "../components/detail/DetailTopbar";
import { listContainer, listItem } from "../utils/motion";
import { toast } from "../store/toast.store";

const ROW =
  "flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors";

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60 ${
        checked ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
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
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <DetailTopbar title="Instellingen" onBack={goBack} />

      <motion.div
        className="mx-auto max-w-lg px-4 py-6 space-y-5"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom, 0px))" }}
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {/* Account */}
        <motion.section variants={listItem}>
          <p className="section-label mb-3">Account</p>
          <div className="card-surface rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <button onClick={() => navigate(routes.notifications)} className={ROW}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/10">
                <Bell size={16} className="text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Notificaties</p>
                <p className="text-xs text-slate-400">Kies welke Discord DM's je ontvangt</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
            </button>

            {me && !me.discord_id && (
              <button onClick={onLinkDiscord} disabled={linkingDiscord} className={`${ROW} disabled:opacity-60`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/10">
                  <MessageSquare size={16} className="text-[#5865F2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {linkingDiscord ? "Bezig met koppelen…" : "Discord koppelen"}
                  </p>
                  <p className="text-xs text-slate-400">Nodig om Discord-DM's van de bot te kunnen ontvangen</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
              </button>
            )}
          </div>
        </motion.section>

        {/* Weergave */}
        <motion.section variants={listItem}>
          <p className="section-label mb-3">Weergave</p>
          <div className="card-surface rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex w-full items-center gap-3.5 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                {isDark ? <Moon size={16} className="text-slate-500 dark:text-slate-300" /> : <Sun size={16} className="text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Donker thema</p>
                <p className="text-xs text-slate-400">Geldt voor dit apparaat</p>
              </div>
              <Switch checked={isDark} onChange={toggleTheme} label="Donker thema" />
            </div>

            {me && (
              <div className="flex w-full items-center gap-3.5 px-4 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10">
                  <Sun size={16} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Begroeting tonen</p>
                  <p className="text-xs text-slate-400">"Goedemiddag, {me.name}" bovenaan de Hub</p>
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
        <motion.section variants={listItem}>
          <p className="section-label mb-3">Delen &amp; links</p>
          <div className="card-surface rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <button onClick={() => setQrOpen((v) => !v)} aria-expanded={qrOpen} className={ROW}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <QrCode size={16} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Deel via QR-code</p>
                <p className="text-xs text-slate-400">Scan om de app te openen</p>
              </div>
              <motion.div animate={{ rotate: qrOpen ? 90 : 0 }} transition={{ duration: 0.18 }}>
                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
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
                    <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
                      <QRCodeSVG value={window.location.origin} size={160} bgColor="#ffffff" fgColor="#0f172a" level="M" />
                    </div>
                    <p className="text-xs text-slate-400">Scan om de app te openen</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <a href="https://github.com/Gavin132/ankerdcon" target="_blank" rel="noopener noreferrer" className={ROW}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <Github size={16} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Broncode</p>
                <p className="text-xs text-slate-400">Bekijk de repository op GitHub</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
            </a>

            <a href="https://www.youtube.com/@ankerd" target="_blank" rel="noopener noreferrer" className={ROW}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/10">
                <Youtube size={16} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">YouTube</p>
                <p className="text-xs text-slate-400">Bekijk het YouTube-kanaal</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
            </a>
          </div>
        </motion.section>

        {/* App */}
        <motion.section variants={listItem}>
          <p className="section-label mb-3">App</p>
          <div className="card-surface rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <img src="/icons/icon-192.png" alt="Ankerd" className="h-7 w-7 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Ankerd Con</p>
                <p className="text-xs text-slate-400">Event portal · v{__APP_VERSION__}</p>
              </div>
            </div>

          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
