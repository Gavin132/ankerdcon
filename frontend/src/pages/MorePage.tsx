import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ChevronRight,
  CalendarDays,
  QrCode,
  CalendarPlus,
  Copy,
  Check,
  Bell,
  Sparkles,
  MessageSquare,
  Sun,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarGrid } from "../components/more/CalendarGrid";
import { CalendarArchive } from "../components/more/CalendarArchive";
import { useUsers, useCurrentUser, useUpdatePreferences } from "../hooks/useUsers";
import { useMeals } from "../hooks/useMeals";
import {
  useCalendar,
  useRsvpCalendarEvent,
  useLeaveCalendarEvent,
} from "../hooks/useCalendar";
import { useAuthStore } from "../store/auth.store";
import { logout, startDiscordLink } from "../services/auth.service";
import { useNavigate } from "react-router-dom";
import { routes } from "../config/routes";
import { UserAvatar } from "../components/common/UserAvatar";
import { env } from "../config/env";
import { listContainer, listItem } from "../utils/motion";
import { toast } from "../store/toast.store";

export function MorePage() {
  const [calendarView, setCalendarView] = useState<"list" | "calendar">("list");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const { data: me } = useCurrentUser();
  const updatePreferences = useUpdatePreferences();

  async function onLinkDiscord() {
    try {
      setLinkingDiscord(true);
      await startDiscordLink();
    } catch {
      setLinkingDiscord(false);
      toast("error", "Kon Discord-koppeling niet starten. Probeer het opnieuw.");
    }
  }

  const feedUrl = `${env.API_BASE_URL || window.location.origin}/api/calendar/feed.ics`;
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, "webcal:"))}`;

  function copyFeedUrl() {
    navigator.clipboard.writeText(feedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  const [qrOpen, setQrOpen] = useState(false);

  const { data: users } = useUsers();
  const { data: calendarEvents } = useCalendar();
  const { data: meals } = useMeals();
  const rsvpMutation = useRsvpCalendarEvent();
  const leaveMutation = useLeaveCalendarEvent();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  async function onCalendarRsvp(id: string, userNames: string[]) {
    for (const userName of userNames) {
      try {
        await rsvpMutation.mutateAsync({ id, userName });
      } catch {
        // silently ignore duplicate sign-ups
      }
    }
  }

  async function onCalendarLeave(id: string, userNames: string[]) {
    for (const userName of userNames) {
      try {
        await leaveMutation.mutateAsync({ id, userName });
      } catch {
        // silently ignore if not found
      }
    }
  }

  async function onLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
      navigate(routes.login, { replace: true });
    }
  }

  const allUsers = users ?? [];

  return (
    <motion.div
      className="space-y-5"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {/* Con Calendar */}
      {(calendarEvents ?? []).length > 0 && (
        <motion.div variants={listItem}>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label flex items-center gap-2">
              <CalendarDays size={13} className="text-sky-500" />
              Con Kalender
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubscribeOpen((v) => !v)}
                title="Abonneer op kalender"
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  subscribeOpen
                    ? "bg-sky-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-500"
                }`}
              >
                <CalendarPlus size={12} />
                Abonneren
              </button>
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-0.5">
                {(["list", "calendar"] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setCalendarView(view)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      calendarView === view
                        ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    {view === "list" ? "Lijst" : "Kalender"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {subscribeOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="card-surface rounded-xl flex items-center gap-2 px-3.5 py-2.5">
                  <p className="flex-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {feedUrl}
                  </p>
                  <button
                    onClick={copyFeedUrl}
                    title="Kopieer link"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                  <a
                    href={googleCalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-sky-500 hover:bg-sky-600 transition-colors px-2.5 py-1.5 text-[11px] font-bold text-white whitespace-nowrap"
                  >
                    Google Calendar
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {calendarView === "list" ? (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <CalendarArchive events={calendarEvents ?? []} meals={meals ?? []} allUsers={allUsers} onRsvp={onCalendarRsvp} onLeave={onCalendarLeave} />
              </motion.div>
            ) : (
              <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <CalendarGrid events={calendarEvents ?? []} meals={meals ?? []} allUsers={allUsers} onRsvp={onCalendarRsvp} onLeave={onCalendarLeave} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Community */}
      <motion.div variants={listItem}>
        <p className="section-label mb-3">Community</p>
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            onClick={() => navigate(routes.members)}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
          >
            <div className="flex -space-x-2 shrink-0">
              {allUsers.slice(0, 5).map((u) => (
                <UserAvatar key={u.name} name={u.name} user={u} className="h-8 w-8 text-[10px] ring-2 ring-white dark:ring-slate-900" />
              ))}
              {allUsers.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300">
                  +{allUsers.length - 5}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 ml-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Bekijk alle leden</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {allUsers.length} {allUsers.length === 1 ? "lid" : "leden"} aanwezig
              </p>
            </div>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
          </button>
        </div>
      </motion.div>

      {/* App */}
      <motion.div variants={listItem}>
        <p className="section-label mb-3">App</p>
        <div className="card-surface rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">

          {/* App identity */}
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <img src="/assets/images/ankerd-logo.png" alt="Ankerd" className="h-7 w-7 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Ankerd Con</p>
              <p className="text-xs text-slate-400">Event portal · v{__APP_VERSION__}</p>
            </div>
          </div>

          {/* QR code row */}
          <button
            onClick={() => setQrOpen((v) => !v)}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
          >
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
                    <QRCodeSVG
                      value={typeof window !== "undefined" ? window.location.origin : ""}
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="M"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Scan om de app te openen</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notifications row */}
          <button
            onClick={() => navigate(routes.notifications)}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/10">
              <Bell size={16} className="text-sky-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Notificaties</p>
              <p className="text-xs text-slate-400">Kies welke Discord DM's je ontvangt</p>
            </div>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
          </button>

          {/* Greeting toggle */}
          {me && (
            <div className="flex w-full items-center gap-3.5 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10">
                <Sun size={16} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Begroeting tonen</p>
                <p className="text-xs text-slate-400">"Goedemiddag, {me.name}" bovenaan de Hub</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={me.show_greeting !== false}
                disabled={updatePreferences.isPending}
                onClick={() =>
                  updatePreferences.mutateAsync({ show_greeting: !(me.show_greeting !== false) }).catch(() =>
                    toast("error", "Kon voorkeur niet opslaan.")
                  )
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60 ${
                  me.show_greeting !== false ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    me.show_greeting !== false ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Link Discord row — only if not already linked */}
          {me && !me.discord_id && (
            <button
              onClick={onLinkDiscord}
              disabled={linkingDiscord}
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors disabled:opacity-60"
            >
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

          {/* Changelog row */}
          <button
            onClick={() => navigate(routes.changelog)}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/10">
              <Sparkles size={16} className="text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Wat is nieuw</p>
              <p className="text-xs text-slate-400">Recente updates en verbeteringen</p>
            </div>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
          </button>

          {/* Logout row */}
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-rose-50 dark:hover:bg-rose-500/5 active:bg-rose-50 dark:active:bg-rose-500/5 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/10">
              <LogOut size={16} className="text-rose-500" />
            </div>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Uitloggen</p>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
