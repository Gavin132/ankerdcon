import { useState } from "react";
import { Users, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { SectionLabel } from "../common/SectionLabel";
import { useAuthStore } from "../../store/auth.store";
import { useCalendar } from "../../hooks/useCalendar";
import type { User } from "../../types";

interface EventAttendeesProps {
  participants: string[];
  users: User[];
  /**
   * When true, renders only the inner content without the card surface or
   * SectionLabel — intended for embedding inside a parent card.
   */
  bare?: boolean;
}

const CLOSED_RECT: AnchorRect = { top: 0, left: 0, right: 0, height: 0 };

export function EventAttendees({ participants, users, bare = false }: EventAttendeesProps) {
  const currentUser              = useAuthStore((s) => s.currentUser);
  const { data: calendarEvents } = useCalendar();

  const [expanded,   setExpanded]   = useState(false);
  const [popupUser,  setPopupUser]  = useState<User | null>(null);
  const [anchorRect, setAnchorRect] = useState<AnchorRect>(CLOSED_RECT);
  const [popupOpen,  setPopupOpen]  = useState(false);

  if (participants.length === 0) return null;

  function resolveUser(stored: string) {
    return users.find(
      (u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored),
    );
  }

  function openPopup(user: User, e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
    setPopupUser(user);
    setPopupOpen(true);
  }

  // ── Shared inner content ─────────────────────────────────────────────────

  const innerContent = (
    <>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${
          bare ? "px-5 py-4" : "px-5 py-4"
        }`}
      >
        {/* Facepile */}
        <div className="flex -space-x-3 min-w-0">
          {participants.slice(0, 10).map((p) => {
            const u = resolveUser(p);
            return (
              <UserAvatar
                key={p}
                name={u?.name ?? p}
                user={u}
                className="h-9 w-9 text-xs ring-2 ring-white dark:ring-slate-900"
              />
            );
          })}
          {participants.length > 10 && (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
              +{participants.length - 10}
            </div>
          )}
        </div>

        {/* Count + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5">
            <Users size={12} className="text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
              {participants.length}
            </span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500">
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={15} />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Expandable chips */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="chips"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800/60">
              {participants.map((p) => {
                const u    = resolveUser(p);
                const name = u?.name ?? p;
                return u ? (
                  <button
                    key={p}
                    onClick={(e) => openPopup(u, e)}
                    className="inline-flex items-center gap-1.5 rounded-full
                               bg-slate-100 dark:bg-slate-800
                               border border-slate-200/80 dark:border-slate-700
                               px-3 py-1.5 text-[12px] font-semibold
                               text-slate-700 dark:text-slate-200
                               hover:bg-slate-200 dark:hover:bg-slate-700
                               hover:border-slate-300 dark:hover:border-slate-600
                               active:scale-95 transition-all cursor-pointer"
                  >
                    <UserAvatar name={name} user={u} className="h-4 w-4 text-[7px] !border-0" />
                    {name}
                  </button>
                ) : (
                  <div
                    key={p}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <UserAvatar name={name} user={undefined} className="h-4 w-4 text-[7px] !border-0" />
                    {name}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ── Popup (always needed) ────────────────────────────────────────────────

  const popup = (
    <UserProfilePopup
      user={popupUser}
      open={popupOpen}
      isOwn={currentUser === popupUser?.id}
      anchorRect={anchorRect}
      onClose={() => setPopupOpen(false)}
      calendarEvents={calendarEvents}
    />
  );

  // ── Bare mode: just the content, no card wrapper ─────────────────────────

  if (bare) {
    return (
      <>
        {innerContent}
        {popup}
      </>
    );
  }

  // ── Standalone mode: own card + section label ────────────────────────────

  return (
    <div className="flex flex-col gap-3 h-full">
      <SectionLabel>Aanmeldingen</SectionLabel>
      <div className="card-surface rounded-2xl overflow-hidden flex-1">
        <div className="h-[3px] bg-gradient-to-r from-indigo-400 to-violet-500" />
        {innerContent}
      </div>
      {popup}
    </div>
  );
}
