import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  Clock,
  MapPin,
  Banknote,
  Bus,
  UserCheck,
  UserMinus,
  ChevronDown,
  Trash2,
  CalendarPlus,
} from "lucide-react";

import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { UserProfilePopup, type AnchorRect } from "../common/UserProfilePopup";
import {
  useRsvpMeal,
  useCancelRsvp,
  useDeleteMeal,
} from "../../hooks/useMeals";
import { useUsers } from "../../hooks/useUsers";
import { useAuthStore } from "../../store/auth.store";
import { formatDateTime } from "../../utils/format";
import { exportMealToIcs } from "../../utils/ics";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import type { Meal, User } from "../../types";

interface MealCardProps {
  meal: Meal;
  userNames: string[];
}

export function MealCard({ meal, userNames }: MealCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);
  const [cancelNames, setCancelNames] = useState<string[]>([]);
  const [popupUser, setPopupUser] = useState<User | null>(null);
  const [popupAnchorRect, setPopupAnchorRect] = useState<AnchorRect>({
    top: 0,
    left: 0,
    right: 0,
    height: 0,
  });

  const rsvpMutation = useRsvpMeal();
  const cancelMutation = useCancelRsvp();
  const deleteMutation = useDeleteMeal();
  const { data: users = [] } = useUsers();
  const currentUser = useAuthStore((s) => s.currentUser);

  function resolveUser(stored: string) {
    return users.find(
      (u) =>
        u.name === stored ||
        u.discord_username === stored ||
        u.aliases?.includes(stored),
    );
  }

  // 1. Safe fallback for participants array
  const safeParticipants = meal.participants ?? [];

  async function onRsvp() {
    if (rsvpNames.length === 0) return;
    try {
      for (const name of rsvpNames) {
        // 2. CHANGED rowNumber to id
        await rsvpMutation.mutateAsync({
          id: meal.id,
          payload: { user_name: name },
        });
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
        // 3. CHANGED rowNumber to id
        await cancelMutation.mutateAsync({
          id: meal.id,
          payload: { user_name: name },
        });
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
      // 4. CHANGED meal.row_number to meal.id
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
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <UtensilsCrossed
                  size={20}
                  className="text-white"
                  strokeWidth={2}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <h3 className="font-black text-slate-900 text-sm">
                    {meal.meal_name}
                  </h3>
                  {meal.transport_needed && (
                    <Badge variant="blue">
                      <Bus size={10} />
                      Vervoer nodig
                    </Badge>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Clock size={11} className="text-amber-400 shrink-0" />
                  {formatDateTime(meal.time)}
                </span>
              </div>

              <button
                onClick={() => setExpanded((e) => !e)}
                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </button>
            </div>

            {(meal.location || meal.cost) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {meal.location && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                    <MapPin size={11} className="text-sky-500 shrink-0" />
                    {meal.location}
                  </span>
                )}
                {meal.cost && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                    <Banknote size={11} />
                    {meal.cost} p.p.
                  </span>
                )}
              </div>
            )}

            {/* ── Participant avatar strip ─────────────────────────── */}
            <div className="mt-3">
              {safeParticipants.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setParticipantsExpanded((v) => !v)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex -space-x-1.5">
                      {safeParticipants.slice(0, 6).map((p) => {
                        const u = resolveUser(p);
                        return (
                          <UserAvatar
                            key={p}
                            name={p}
                            user={u}
                            className="h-6 w-6 text-[9px]"
                          />
                        );
                      })}
                      {safeParticipants.length > 6 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                          +{safeParticipants.length - 6}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400/70 dark:text-slate-400/60 hover:text-slate-500 dark:hover:text-slate-400 transition-colors ">
                      {participantsExpanded
                        ? "Verbergen"
                        : `${safeParticipants.length} aangemeld`}
                    </span>
                  </button>

                  <AnimatePresence>
                    {participantsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-1.5 pt-0.5 mt-2">
                          {safeParticipants.map((p) => {
                            const u = resolveUser(p);
                            const displayName = u?.name ?? p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={(e) => {
                                  if (!u) return;
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  setPopupAnchorRect({
                                    top: rect.top,
                                    left: rect.left,
                                    right: rect.right,
                                    height: rect.height,
                                  });
                                  setPopupUser(u);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                <UserAvatar
                                  name={p}
                                  user={u}
                                  className="h-3.5 w-3.5 text-[7px] !border-0"
                                />
                                {displayName}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Nog niemand aangemeld
                </span>
              )}
            </div>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1"
                        onClick={() => setRsvpOpen(true)}
                      >
                        <UserCheck size={14} />
                        Aanmelden
                      </Button>
                      {safeParticipants.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCancelOpen(true)}
                        >
                          <UserMinus size={14} />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportMealToIcs(meal)}
                        title="Toevoegen aan kalender"
                      >
                        <CalendarPlus size={14} className="text-sky-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 size={14} className="text-rose-400" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <Modal
        open={rsvpOpen}
        onClose={() => {
          setRsvpOpen(false);
          setRsvpNames([]);
        }}
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
          <Button
            onClick={onRsvp}
            loading={rsvpMutation.isPending}
            className="w-full"
            disabled={rsvpNames.length === 0}
          >
            <UserCheck size={15} />
            {rsvpNames.length === 0
              ? "Selecteer een naam"
              : rsvpNames.length === 1
                ? `${rsvpNames[0]} aanmelden`
                : `${rsvpNames.length} personen aanmelden`}
          </Button>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setCancelNames([]);
        }}
        title="Aanmelding annuleren"
        description={meal.meal_name}
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={safeParticipants}
            value={cancelNames}
            onChange={setCancelNames}
            color="rose"
          />
          <Button
            variant="danger"
            onClick={onCancel}
            loading={cancelMutation.isPending}
            className="w-full"
            disabled={cancelNames.length === 0}
          >
            <UserMinus size={15} />
            {cancelNames.length === 0
              ? "Selecteer een naam"
              : cancelNames.length === 1
                ? `${cancelNames[0]} afmelden`
                : `${cancelNames.length} personen afmelden`}
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Event verwijderen"
        description={`Weet je zeker dat je "${meal.meal_name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
      >
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setDeleteOpen(false)}
          >
            Annuleren
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={deleteMutation.isPending}
            onClick={onDelete}
          >
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
