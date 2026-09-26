import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  MapPin,
  Banknote,
  Bus,
  UserCheck,
  UserMinus,
  CalendarPlus,
  Link2,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";

import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import { useRsvpMeal, useCancelRsvp } from "../../hooks/useMeals";
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
  const navigate = useNavigate();
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);
  const [cancelNames, setCancelNames] = useState<string[]>([]);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>({
    top: 0, left: 0, right: 0, height: 0,
  });

  const rsvpMutation = useRsvpMeal();
  const cancelMutation = useCancelRsvp();
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

  return (
    <>
      <motion.div variants={listItem} className="h-full">
        <div
          onClick={() => navigate(routes.meal.view(meal.id))}
          className="card-surface-hover flex h-full cursor-pointer flex-col gap-2.5 p-3.5"
        >
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink">
              <UtensilsCrossed size={15} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14.5px] font-semibold leading-snug text-ink">{meal.meal_name}</h3>
              {meal.description && (
                <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-3">{meal.description}</p>
              )}
            </div>
            <div className="shrink-0 text-right leading-tight">
              <p className="font-mono text-[15px] font-semibold tabular-nums text-ink">{formatTime(meal.time)}</p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-3">{formatDate(meal.time)}</p>
            </div>
          </div>

          {(meal.location || meal.cost || meal.transport_needed) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-2">
              {meal.location && (
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin size={12} className="shrink-0 text-ink-3" />
                  <span className="truncate">{meal.location}</span>
                </span>
              )}
              {meal.cost ? (
                <span className="flex items-center gap-1">
                  <Banknote size={12} className="shrink-0 text-ink-3" />
                  <span className="font-mono tabular-nums text-ink">{meal.cost}</span> p.p.
                </span>
              ) : null}
              {meal.transport_needed && (
                <span className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2">
                  <Bus size={11} />
                  Vervoer nodig
                </span>
              )}
            </div>
          )}

          {linkedEvent && (
            <Link
              to={routes.event.view(linkedEvent.id)}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-full items-center gap-1 self-start rounded-md border border-line px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
            >
              <Link2 size={10} className="shrink-0" />
              <span className="truncate">{linkedEvent.event_name}</span>
            </Link>
          )}

          {/* ── Footer: participants + actions ──────────────────── */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-dashed border-line pt-2.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (safeParticipants.length > 0) setParticipantsOpen((v) => !v); }}
              className={`flex min-w-0 items-center gap-1 text-[12px] text-ink-2 ${safeParticipants.length > 0 ? "hover:text-ink" : "cursor-default"}`}
              aria-expanded={safeParticipants.length > 0 ? participantsOpen : undefined}
            >
              {safeParticipants.length > 0 ? (
                <>
                  <Users size={12} className="shrink-0 text-ink-3" />
                  <span>
                    <span className="font-mono font-semibold tabular-nums text-ink">{safeParticipants.length}</span> aangemeld
                  </span>
                  <ChevronDown size={12} className={`shrink-0 text-ink-3 transition-transform ${participantsOpen ? "rotate-180" : ""}`} />
                </>
              ) : (
                <span className="flex items-center gap-1 text-ink-3">
                  <Users size={12} />
                  Nog niemand aangemeld
                </span>
              )}
            </button>

            <div className="ml-auto flex items-center gap-1">
              {safeParticipants.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCancelOpen(true); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                  title="Afmelden"
                >
                  <UserMinus size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); exportMealToIcs(meal); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                title="Exporteer naar kalender"
              >
                <CalendarPlus size={14} />
              </button>

              <Button size="sm" variant="primary" className="ml-1 !min-h-[36px] !py-1.5" onClick={(e) => { e.stopPropagation(); setRsvpOpen(true); }}>
                <UserCheck size={13} />
                Aanmelden
              </Button>

              <ChevronRight size={14} className="ml-0.5 shrink-0 text-ink-3" />
            </div>
          </div>

          {/* Expanded participants */}
          <AnimatePresence>
            {participantsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="-mt-1 overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {safeParticipants.map((p) => {
                    const u = resolveUser(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!u) return;
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setPopupAnchorRect({ top: rect.top, left: rect.left, right: rect.right, height: rect.height });
                          setPopupUser(u);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-line px-2 py-1 text-[12px] font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
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
