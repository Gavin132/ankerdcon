import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  MapPin,
  Banknote,
  Bus,
  UserCheck,
  UserMinus,
  Trash2,
  CalendarPlus,
  ArrowRight,
  Link2,
  ChevronDown,
  Users,
} from "lucide-react";

import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { useRsvpMeal, useCancelRsvp, useDeleteMeal } from "../../hooks/useMeals";
import { useUsers } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { useAuthStore } from "../../store/auth.store";
import { formatDate, formatTime } from "../../utils/format";
import { exportMealToIcs } from "../../utils/ics";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import { routes } from "../../config/routes";
import type { Meal, User } from "../../types";

interface MealCardProps {
  meal: Meal;
  userNames: string[];
}

export function MealCard({ meal, userNames }: MealCardProps) {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);
  const [cancelNames, setCancelNames] = useState<string[]>([]);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>({
    top: 0, left: 0, right: 0, height: 0,
  });

  const rsvpMutation = useRsvpMeal();
  const cancelMutation = useCancelRsvp();
  const deleteMutation = useDeleteMeal();
  const { data: users = [] } = useUsers();
  const { data: events = [] } = useCalendar();
  const currentUser = useAuthStore((s) => s.currentUser);

  const linkedEvent = meal.linked_event_id
    ? events.find((e) => e.id === meal.linked_event_id)
    : undefined;

  function resolveUser(stored: string) {
    return users.find(
      (u) => u.name === stored || u.discord_username === stored || u.aliases?.includes(stored),
    );
  }

  const safeParticipants = meal.participants ?? [];

  async function onRsvp() {
    if (rsvpNames.length === 0) return;
    try {
      for (const name of rsvpNames) {
        await rsvpMutation.mutateAsync({ id: meal.id, payload: { user_name: name } });
      }
      setRsvpNames([]);
      setRsvpOpen(false);
      toast(
        "success",
        rsvpNames.length === 1
          ? `${rsvpNames[0]} is aangemeld voor ${meal.meal_name}!`
          : `${rsvpNames.length} personen aangemeld voor ${meal.meal_name}!`,
      );
    } catch {
      toast("error", "Kon je niet aanmelden. Probeer opnieuw.");
    }
  }

  async function onCancel() {
    if (cancelNames.length === 0) return;
    try {
      for (const name of cancelNames) {
        await cancelMutation.mutateAsync({ id: meal.id, payload: { user_name: name } });
      }
      setCancelNames([]);
      setCancelOpen(false);
      toast(
        "success",
        cancelNames.length === 1
          ? `${cancelNames[0]} afgemeld.`
          : `${cancelNames.length} personen afgemeld.`,
      );
    } catch {
      toast("error", "Kon aanmelding niet annuleren.");
    }
  }

  async function onDelete() {
    try {
      await deleteMutation.mutateAsync(meal.id);
      setDeleteOpen(false);
      toast("success", `${meal.meal_name} is verwijderd.`);
    } catch {
      toast("error", "Kon het event niet verwijderen.");
    }
  }

  return (
    <>
      <motion.div variants={listItem}>
        {/* card-surface provides correct bg + border + shadow in both light and dark */}
        <div className="card-surface rounded-2xl overflow-hidden">

          {/* Amber accent line */}
          <div className="h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300" />

          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <UtensilsCrossed size={17} className="text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-slate-900 text-sm leading-snug">{meal.meal_name}</h3>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-slate-700">{formatDate(meal.time)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatTime(meal.time)}</p>
                </div>
              </div>
              {meal.description && (
                <p className="mt-0.5 text-[12px] text-slate-400 line-clamp-1">{meal.description}</p>
              )}
              {(meal.location || meal.cost || meal.transport_needed) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {meal.location && (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-slate-500">
                      <MapPin size={10} className="text-slate-400 shrink-0" />
                      {meal.location}
                    </span>
                  )}
                  {meal.cost ? (
                    <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Banknote size={10} className="shrink-0" />
                      {meal.cost} p.p.
                    </span>
                  ) : null}
                  {meal.transport_needed && (
                    <span className="flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/40 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                      <Bus size={9} />
                      Vervoer nodig
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Participants + linked event ──────────────────────── */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => safeParticipants.length > 0 && setParticipantsOpen((v) => !v)}
              className={`flex items-center gap-2 min-w-0 ${safeParticipants.length > 0 ? "hover:opacity-75 transition-opacity" : "cursor-default"}`}
            >
              {safeParticipants.length > 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {safeParticipants.slice(0, 4).map((p) => (
                      <UserAvatar
                        key={p}
                        name={p}
                        user={resolveUser(p)}
                        className="h-6 w-6 text-[9px] ring-2 ring-white dark:ring-[#1e293b]"
                      />
                    ))}
                    {safeParticipants.length > 4 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#1e293b] bg-slate-200 dark:bg-slate-600 text-[9px] font-bold text-slate-600 dark:text-slate-200">
                        +{safeParticipants.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{safeParticipants.length}</span> aangemeld
                  </span>
                  <motion.div animate={{ rotate: participantsOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                    <ChevronDown size={11} className="text-slate-400" />
                  </motion.div>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
                  <Users size={11} />
                  Nog niemand aangemeld
                </span>
              )}
            </button>

            {linkedEvent && (
              <Link
                to={routes.event.view(linkedEvent.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-700/60 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors max-w-[140px]"
              >
                <Link2 size={10} className="shrink-0" />
                <span className="truncate">{linkedEvent.event_name}</span>
              </Link>
            )}
          </div>

          {/* Expanded participants */}
          <AnimatePresence>
            {participantsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {safeParticipants.map((p) => {
                    const u = resolveUser(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={(e) => {
                          if (!u) return;
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setPopupAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
                          setPopupUser(u);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <UserAvatar name={p} user={u} className="h-4 w-4 text-[8px] !border-0" />
                        {u?.name ?? p}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Action bar ──────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 px-3 py-2">
            <Link
              to={routes.meal.view(meal.id)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Details
              <ArrowRight size={11} />
            </Link>

            <div className="flex-1" />

            {safeParticipants.length > 0 && (
              <button
                onClick={() => setCancelOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-rose-500 transition-colors"
                title="Afmelden"
              >
                <UserMinus size={14} />
              </button>
            )}

            <button
              onClick={() => exportMealToIcs(meal)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-500 transition-colors"
              title="Exporteer naar kalender"
            >
              <CalendarPlus size={14} />
            </button>

            <button
              onClick={() => setDeleteOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-rose-500 transition-colors"
              title="Verwijderen"
            >
              <Trash2 size={14} />
            </button>

            <Button size="sm" variant="primary" onClick={() => setRsvpOpen(true)}>
              <UserCheck size={13} />
              Aanmelden
            </Button>
          </div>
        </div>
      </motion.div>

      {/* RSVP modal */}
      <Modal
        open={rsvpOpen}
        onClose={() => { setRsvpOpen(false); setRsvpNames([]); }}
        title={`Aanmelden — ${meal.meal_name}`}
        description={meal.location || undefined}
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={userNames.filter((n) => !safeParticipants.includes(n))}
            value={rsvpNames}
            onChange={setRsvpNames}
            color="green"
          />
          <Button onClick={onRsvp} loading={rsvpMutation.isPending} className="w-full" disabled={rsvpNames.length === 0}>
            <UserCheck size={15} />
            {rsvpNames.length === 0 ? "Selecteer een naam" : rsvpNames.length === 1 ? `${rsvpNames[0]} aanmelden` : `${rsvpNames.length} personen aanmelden`}
          </Button>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelNames([]); }}
        title="Aanmelding annuleren"
        description={meal.meal_name}
      >
        <div className="space-y-3">
          <NamePicker multiple options={safeParticipants} value={cancelNames} onChange={setCancelNames} color="rose" />
          <Button variant="danger" onClick={onCancel} loading={cancelMutation.isPending} className="w-full" disabled={cancelNames.length === 0}>
            <UserMinus size={15} />
            {cancelNames.length === 0 ? "Selecteer een naam" : cancelNames.length === 1 ? `${cancelNames[0]} afmelden` : `${cancelNames.length} personen afmelden`}
          </Button>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Maaltijd verwijderen" description={`Weet je zeker dat je "${meal.meal_name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteOpen(false)}>Annuleren</Button>
          <Button variant="danger" className="flex-1" loading={deleteMutation.isPending} onClick={onDelete}>
            <Trash2 size={14} />
            Verwijderen
          </Button>
        </div>
      </Modal>

      <UserProfilePopup
        user={popupUser}
        open={popupUser !== null}
        isOwn={currentUser === popupUser?.id}
        anchorRect={popupAnchorRect}
        onClose={() => setPopupUser(null)}
      />
    </>
  );
}
