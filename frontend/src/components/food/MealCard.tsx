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
  Users,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { useRsvpMeal, useCancelRsvp, useDeleteMeal } from "../../hooks/useMeals";
import { formatDateTime } from "../../utils/format";
import { toast } from "../../store/toast.store";
import { listItem } from "../../utils/motion";
import type { Meal } from "../../types";

const nameSchema = z.object({
  user_name: z.string().min(1, "Vul je naam in"),
});
type NameForm = z.infer<typeof nameSchema>;

interface MealCardProps {
  meal: Meal;
  userNames: string[];
}

export function MealCard({ meal, userNames }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rsvpMutation = useRsvpMeal();
  const cancelMutation = useCancelRsvp();
  const deleteMutation = useDeleteMeal();

  const rsvpForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const cancelForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });

  async function onRsvp(values: NameForm) {
    try {
      await rsvpMutation.mutateAsync({ rowNumber: meal.row_number, payload: values });
      rsvpForm.reset();
      setRsvpOpen(false);
      toast("success", `${values.user_name} is aangemeld voor ${meal.meal_name}!`);
    } catch {
      toast("error", "Kon je niet aanmelden. Probeer opnieuw.");
    }
  }

  async function onCancel(values: NameForm) {
    try {
      await cancelMutation.mutateAsync({ rowNumber: meal.row_number, payload: values });
      cancelForm.reset();
      setCancelOpen(false);
      toast("success", "Aanmelding geannuleerd.");
    } catch {
      toast("error", "Kon aanmelding niet annuleren.");
    }
  }

  async function onDelete() {
    try {
      await deleteMutation.mutateAsync(meal.row_number);
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
                <UtensilsCrossed size={20} className="text-white" strokeWidth={2} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <h3 className="font-black text-slate-900 text-sm">{meal.meal_name}</h3>
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
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} />
                </motion.div>
              </button>
            </div>

            {(meal.location || meal.cost) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {meal.location && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
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

            <div className="mt-3 px-1">
              {meal.rsvps.length > 0 ? (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users size={11} className="text-slate-400" />
                  <span className="font-bold text-slate-800">{meal.rsvps.length}</span>
                  {meal.rsvps.length === 1 ? " persoon" : " personen"} aangemeld
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">Nog niemand aangemeld</span>
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
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    {meal.rsvps.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                          <UserCheck size={11} className="mr-1 inline" />
                          Aangemeld
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {meal.rsvps.map((r) => (
                            <Badge key={r} variant="green">
                              <UserCheck size={10} />
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1"
                        onClick={() => setRsvpOpen(true)}
                      >
                        <UserCheck size={14} />
                        Aanmelden
                      </Button>
                      {meal.rsvps.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}>
                          <UserMinus size={14} />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
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
        onClose={() => setRsvpOpen(false)}
        title={`Aanmelden — ${meal.meal_name}`}
        description={meal.location || undefined}
      >
        <form onSubmit={rsvpForm.handleSubmit(onRsvp)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            {userNames.length > 0 ? (
              <select className="input-field" {...rsvpForm.register("user_name")}>
                <option value="">Selecteer naam…</option>
                {userNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input className="input-field" placeholder="Naam" {...rsvpForm.register("user_name")} />
            )}
            {rsvpForm.formState.errors.user_name && (
              <p className="mt-1.5 text-xs text-rose-500">
                {rsvpForm.formState.errors.user_name.message}
              </p>
            )}
          </div>
          <Button type="submit" loading={rsvpForm.formState.isSubmitting} className="w-full">
            Aanmelding bevestigen
          </Button>
        </form>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Aanmelding annuleren"
        description={meal.meal_name}
      >
        <form onSubmit={cancelForm.handleSubmit(onCancel)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <select className="input-field" {...cancelForm.register("user_name")}>
              <option value="">Selecteer naam…</option>
              {meal.rsvps.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {cancelForm.formState.errors.user_name && (
              <p className="mt-1.5 text-xs text-rose-500">
                {cancelForm.formState.errors.user_name.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            variant="danger"
            loading={cancelForm.formState.isSubmitting}
            className="w-full"
          >
            Aanmelding annuleren
          </Button>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Event verwijderen"
        description={`Weet je zeker dat je "${meal.meal_name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
      >
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteOpen(false)}>
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
    </>
  );
}
