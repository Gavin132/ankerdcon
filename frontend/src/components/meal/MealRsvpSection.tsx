import { useState } from "react";
import { UserCheck, UserMinus, Users } from "lucide-react";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { NamePicker } from "../common/NamePicker";
import { UserAvatar } from "../common/UserAvatar";
import { useRsvpMeal, useCancelRsvp } from "../../hooks/useMeals";
import { toast } from "../../store/toast.store";
import type { Meal, User } from "../../types";

interface MealRsvpSectionProps {
  meal: Meal;
  userNames: string[];
  users: User[];
}

export function MealRsvpSection({ meal, userNames, users }: MealRsvpSectionProps) {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rsvpNames, setRsvpNames] = useState<string[]>([]);
  const [cancelNames, setCancelNames] = useState<string[]>([]);

  const rsvpMutation = useRsvpMeal();
  const cancelMutation = useCancelRsvp();
  const participants = meal.participants ?? [];

  function resolveUser(stored: string) {
    return users.find(
      (u) =>
        u.name === stored ||
        u.discord_username === stored ||
        u.aliases?.includes(stored),
    );
  }

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
          ? `${rsvpNames[0]} is aangemeld!`
          : `${rsvpNames.length} personen aangemeld!`,
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
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500" />
        <div className="px-4 py-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aanmeldingen</h2>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {participants.length}{" "}
                <span className="text-sm font-semibold text-slate-400">
                  {participants.length === 1 ? "aanmelding" : "aanmeldingen"}
                </span>
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
              <Users size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* Attendee grid */}
          {participants.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {participants.map((p) => {
                const u = resolveUser(p);
                return (
                  <div
                    key={p}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-black/20 px-3 py-2.5"
                  >
                    <UserAvatar name={p} user={u} className="h-7 w-7 text-[10px] shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {u?.name ?? p}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
                <Users size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Nog niemand aangemeld</p>
              <p className="text-xs text-slate-400 mt-0.5">Wees de eerste!</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <Button onClick={() => setRsvpOpen(true)} className="flex-1">
              <UserCheck size={15} />
              Aanmelden
            </Button>
            {participants.length > 0 && (
              <Button variant="ghost" onClick={() => setCancelOpen(true)}>
                <UserMinus size={15} />
                Afmelden
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={rsvpOpen}
        onClose={() => { setRsvpOpen(false); setRsvpNames([]); }}
        title={`Aanmelden — ${meal.meal_name}`}
        description={meal.location || undefined}
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={userNames.filter((n) => !participants.includes(n))}
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
        onClose={() => { setCancelOpen(false); setCancelNames([]); }}
        title="Aanmelding annuleren"
        description={meal.meal_name}
      >
        <div className="space-y-3">
          <NamePicker
            multiple
            options={participants}
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
    </>
  );
}
