import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  LogOut,
  BedDouble,
  ChevronRight,
  ChevronDown,
  Navigation,
  CalendarDays,
  Search,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { LocationPingDisplay } from "../components/common/LocationPingDisplay";
import { NamePicker } from "../components/common/NamePicker";
import { CalendarGrid } from "../components/more/CalendarGrid";
import { CalendarArchive } from "../components/more/CalendarArchive";
import { useUsers, usePingLocation } from "../hooks/useUsers";
import { useCalendar, useRsvpCalendarEvent, useLeaveCalendarEvent } from "../hooks/useCalendar";
import { useAuthStore } from "../store/auth.store";
import { UserNameDisplay } from "../components/common/UserNameDisplay";
import { UserProfilePopup, type AnchorRect } from "../components/common/UserProfilePopup";
import { logout } from "../services/auth.service";
import { useNavigate } from "react-router-dom";
import { avatarColor } from "../utils/avatar";
import { UserAvatar } from "../components/common/UserAvatar";
import type { User } from "../types";
import { formatDate } from "../utils/format";
import { parseEventDate } from "../utils/date";
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
  const [crewExpanded, setCrewExpanded] = useState(false);
  const [crewQuery, setCrewQuery] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>({ top: 0, left: 0, right: 0, height: 0 });

  const { data: users, isLoading } = useUsers();
  const { data: calendarEvents } = useCalendar();
  const pingMutation = usePingLocation();
  const rsvpMutation = useRsvpCalendarEvent();
  const leaveMutation = useLeaveCalendarEvent();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const currentUser = useAuthStore((s) => s.currentUser);
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

  async function onCalendarRsvp(id: string, userName: string) {
    try {
      await rsvpMutation.mutateAsync({ id, userName });
    } catch {
      // silently ignore duplicate sign-ups
    }
  }

  async function onCalendarLeave(id: string, userName: string) {
    try {
      await leaveMutation.mutateAsync({ id, userName });
    } catch {
      // silently ignore if not found
    }
  }

  async function onLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  const allUsers = users ?? [];
  const filteredUsers = crewQuery
    ? allUsers.filter((u) => u.name.toLowerCase().includes(crewQuery.toLowerCase()))
    : allUsers;

  // Find the next upcoming calendar event (include today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const nextEvent = (calendarEvents ?? [])
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
      {/* Live locatie */}
      <motion.div variants={listItem}>
        <p className="section-label mb-3">Live locatie</p>
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            onClick={() => setPingOpen(true)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 active:bg-slate-50 transition-colors dark:hover:bg-slate-800/60 dark:active:bg-slate-800/60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand">
              <Navigation size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 dark:text-white text-sm">Locatie pingen</p>
              <p className="text-xs text-slate-400 mt-0.5">Stuur je locatie naar de groep</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        </div>
      </motion.div>

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
              <p className="font-black text-white text-base leading-tight">{nextEvent.event_name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-sky-300">
                <CalendarDays size={12} className="text-sky-400" />
                {formatDate(nextEvent.date)}
                {nextEvent.is_hotel && " · Hotel inbegrepen"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Con Calendar — list or grid view */}
      {(calendarEvents ?? []).length > 0 && (
        <motion.div variants={listItem}>
          {/* Header + view toggle */}
          <div className="flex items-center justify-between mb-3">
            <p className="section-label flex items-center gap-2">
              <CalendarDays size={13} className="text-sky-500" />
              Con Kalender
            </p>
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

          {/* Both views rendered simultaneously in the same grid cell so
              height never changes during the crossfade transition */}
          <div className="grid">
            <motion.div
              style={{ gridArea: "1 / 1" }}
              animate={{ opacity: calendarView === "list" ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className={calendarView !== "list" ? "pointer-events-none" : ""}
            >
              <CalendarArchive
                events={calendarEvents ?? []}
                allUsers={allUsers.map((u) => u.name)}
                onRsvp={onCalendarRsvp}
                onLeave={onCalendarLeave}
              />
            </motion.div>
            <motion.div
              style={{ gridArea: "1 / 1" }}
              animate={{ opacity: calendarView === "calendar" ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className={calendarView !== "calendar" ? "pointer-events-none" : ""}
            >
              <CalendarGrid
                events={calendarEvents ?? []}
                allUsers={allUsers.map((u) => u.name)}
                onRsvp={onCalendarRsvp}
                onLeave={onCalendarLeave}
              />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Crew members — collapsible */}
      <motion.div variants={listItem}>
        <button
          onClick={() => setCrewExpanded((e) => !e)}
          className="flex w-full items-center justify-between mb-3 group"
        >
          <p className="section-label">Leden ({allUsers.length})</p>
          <motion.div
            animate={{ rotate: crewExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400 group-hover:text-slate-600 transition-colors"
          >
            <ChevronDown size={16} />
          </motion.div>
        </button>

        {/* Avatar strip (always visible) */}
        {!crewExpanded && allUsers.length > 0 && (
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCrewExpanded(true)}>
            <div className="flex -space-x-2">
              {allUsers.slice(0, 8).map((u) => (
                <UserAvatar key={u.name} name={u.name} className="h-9 w-9 text-xs" />
              ))}
              {allUsers.length > 8 && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-black text-slate-600">
                  +{allUsers.length - 8}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">Tik om te bekijken</span>
          </div>
        )}

        <AnimatePresence>
          {crewExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      className="input-field py-2 pl-8 text-sm"
                      placeholder="Zoek lid..."
                      value={crewQuery}
                      onChange={(e) => setCrewQuery(e.target.value)}
                    />
                  </div>

                  <div className="card-surface rounded-2xl divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredUsers.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">
                        Geen resultaten voor &ldquo;{crewQuery}&rdquo;
                      </p>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u.name}
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setPopupAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
                            setPopupUser(u);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 active:bg-slate-50 transition-colors dark:hover:bg-slate-800/60"
                        >
                          <UserAvatar name={u.name} className="h-10 w-10 text-sm rounded-xl" />
                          <div className="flex-1 min-w-0">
                            <UserNameDisplay
                              name={u.name}
                              clickable={false}
                              className="font-bold text-sm block"
                            />
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                              {u.hotel_room && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <BedDouble size={11} />
                                  Kamer {u.hotel_room}
                                </span>
                              )}
                            </div>
                          </div>
                          {u.live_location_ping && (
                            <LocationPingDisplay raw={u.live_location_ping} />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* App info + QR share */}
      <motion.div variants={listItem}>
        <div className="rounded-2xl border border-slate-100 bg-white/60 px-5 py-4 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-sky-100 shadow-sm overflow-hidden">
            <img src="/assets/images/ankerd-logo.png" alt="Ankerd" className="h-8 w-8 object-contain" />
          </div>
          <p className="font-black text-slate-800 dark:text-white text-sm">Ankerd Con</p>
          <p className="text-xs text-slate-400 mt-0.5">Event portal · v{__APP_VERSION__}</p>

          <button
            onClick={() => setQrOpen((v) => !v)}
            className="mt-3 flex items-center gap-1.5 mx-auto text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors"
          >
            <QrCode size={13} />
            {qrOpen ? "Verberg QR-code" : "Deel via QR-code"}
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
                <div className="mt-4 flex flex-col items-center gap-2">
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
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div variants={listItem}>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 py-3.5 min-h-[52px] text-sm font-semibold text-rose-600 hover:bg-rose-100 active:bg-rose-100 transition-colors dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/40 dark:active:bg-rose-900/40"
        >
          <LogOut size={16} />
          Uitloggen
        </button>
      </motion.div>

      {/* Profile popup */}
      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={popupAnchorRect}
        onClose={() => setPopupUser(null)}
        calendarEvents={calendarEvents ?? []}
      />

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
              <p className="mt-1.5 text-xs text-rose-500">{errors.user_name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Zone</label>
            <select className="input-field" {...register("zone")}>
              <option value="">Selecteer zone…</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            {errors.zone && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.zone.message}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Details</label>
            <input className="input-field" placeholder="Bijv. Hal B, ingang links" {...register("text")} />
            {errors.text && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.text.message}</p>
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
