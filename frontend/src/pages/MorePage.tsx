import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  LogOut,
  ChevronRight,
  Navigation,
  CalendarDays,
  QrCode,
  CalendarPlus,
  Copy,
  Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { NamePicker } from "../components/common/NamePicker";
import { CalendarGrid } from "../components/more/CalendarGrid";
import { CalendarArchive } from "../components/more/CalendarArchive";
import { useUsers, usePingLocation } from "../hooks/useUsers";
import {
  useCalendar,
  useRsvpCalendarEvent,
  useLeaveCalendarEvent,
} from "../hooks/useCalendar";
import { useAuthStore } from "../store/auth.store";
import { logout } from "../services/auth.service";
import { useNavigate } from "react-router-dom";
import { routes } from "../config/routes";
import { UserAvatar } from "../components/common/UserAvatar";
import { formatDate } from "../utils/format";
import { parseEventDate } from "../utils/date";
import { env } from "../config/env";
import { listContainer, listItem } from "../utils/motion";

const ZONES = ["Op locatie", "Hotel", "Onderweg", "Off-site", "Thuis"] as const;

const pingSchema = z.object({
  user_name: z.string().min(1, "Verplicht"),
  zone: z.string().min(1, "Selecteer een zone"),
  text: z.string().min(1, "Voer details in"),
});
type PingForm = z.infer<typeof pingSchema>;

export function MorePage() {
  const [pingOpen, setPingOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<"list" | "calendar">("list");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const pingMutation = usePingLocation();
  const rsvpMutation = useRsvpCalendarEvent();
  const leaveMutation = useLeaveCalendarEvent();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PingForm>({ resolver: zodResolver(pingSchema) });

  async function onPing(values: PingForm) {
    await pingMutation.mutateAsync(values);
    reset({});
    setPingOpen(false);
  }

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

  // Find the next upcoming calendar event (include today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const nextEvent =
    (calendarEvents ?? [])
      .map((ev) => ({ ev, date: parseEventDate(ev.date) }))
      .filter(({ date }) => date !== null && date >= todayStart)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())[0]?.ev ?? null;

  return (
    <motion.div
      className="space-y-5"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {/* Upcoming event banner */}
      {nextEvent && (
        <motion.div variants={listItem}>
          <div className="relative overflow-hidden rounded-2xl gradient-hero px-5 py-4 shadow-hero">
            <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-sky-400/10" />
            <div className="relative">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                  Aankomend evenement
                </span>
              </div>
              <p className="font-black text-white text-base leading-tight">
                {nextEvent.event_name}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-sky-300">
                <CalendarDays size={12} className="text-sky-400" />
                {formatDate(nextEvent.date)}
                {nextEvent.is_hotel && " · Hotel inbegrepen"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Acties */}
      <motion.div variants={listItem}>
        <p className="section-label mb-3">Acties</p>
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            onClick={() => setPingOpen(true)}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/10">
              <Navigation size={16} className="text-sky-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Locatie pingen</p>
              <p className="text-xs text-slate-400 mt-0.5">Stuur je locatie naar de groep</p>
            </div>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
          </button>
        </div>
      </motion.div>

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
                <CalendarArchive events={calendarEvents ?? []} allUsers={allUsers} onRsvp={onCalendarRsvp} onLeave={onCalendarLeave} />
              </motion.div>
            ) : (
              <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <CalendarGrid events={calendarEvents ?? []} allUsers={allUsers} onRsvp={onCalendarRsvp} onLeave={onCalendarLeave} />
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

      {/* Ping modal */}
      <Modal
        open={pingOpen}
        onClose={() => setPingOpen(false)}
        title="Locatie pingen"
        description="Stuur een snelle update naar de groep"
      >
        <form onSubmit={handleSubmit(onPing)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <NamePicker
              options={allUsers.map((u) => u.name)}
              value={watch("user_name") ?? ""}
              onChange={(v) => setValue("user_name", v)}
              color="sky"
            />
            {errors.user_name && (
              <p className="mt-1.5 text-xs text-rose-500">
                {errors.user_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Zone
            </label>
            <select className="input-field" {...register("zone")}>
              <option value="">Selecteer zone…</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            {errors.zone && (
              <p className="mt-1.5 text-xs text-rose-500">
                {errors.zone.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Details
            </label>
            <input
              className="input-field"
              placeholder="Bijv. Hal B, ingang links"
              {...register("text")}
            />
            {errors.text && (
              <p className="mt-1.5 text-xs text-rose-500">
                {errors.text.message}
              </p>
            )}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            <MapPin size={16} />
            Pingen
          </Button>
        </form>
      </Modal>
    </motion.div>
  );
}
