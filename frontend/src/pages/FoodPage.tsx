import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  Clock,
  MapPin,
  Banknote,
  Bus,
  Plus,
  UserCheck,
  UserMinus,
  Users,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import {
  useMeals,
  useCreateMeal,
  useRsvpMeal,
  useCancelRsvp,
  useDeleteMeal,
} from "../hooks/useMeals";
import { useUsers } from "../hooks/useUsers";
import { formatDateTime } from "../utils/format";
import { toast } from "../store/toast.store";
import type { Meal } from "../types";

const createSchema = z.object({
  meal_name: z.string().min(1, "Verplicht"),
  time: z.string().min(1, "Verplicht"),
  location: z.string().optional(),
  cost: z.string().optional(),
  transport_needed: z.boolean().optional(),
});

const nameSchema = z.object({
  user_name: z.string().min(1, "Vul je naam in"),
});

type CreateForm = z.infer<typeof createSchema>;
type NameForm = z.infer<typeof nameSchema>;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const cardItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

function MealCard({ meal, userNames }: { meal: Meal; userNames: string[] }) {
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
      await rsvpMutation.mutateAsync({
        rowNumber: meal.row_number,
        payload: values,
      });
      rsvpForm.reset();
      setRsvpOpen(false);
      toast(
        "success",
        `${values.user_name} is aangemeld voor ${meal.meal_name}!`,
      );
    } catch {
      toast("error", "Kon je niet aanmelden. Probeer opnieuw.");
    }
  }

  async function onCancel(values: NameForm) {
    try {
      await cancelMutation.mutateAsync({
        rowNumber: meal.row_number,
        payload: values,
      });
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
      <motion.div variants={cardItem}>
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="p-4">
            {/* Header */}
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
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </button>
            </div>

            {/* Meta chips */}
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

            {/* Attendee count */}
            <div className="mt-3 px-1">
              {meal.rsvps.length > 0 ? (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users size={11} className="text-slate-400" />
                  <span className="font-bold text-slate-800">
                    {meal.rsvps.length}
                  </span>
                  {meal.rsvps.length === 1 ? " persoon" : " personen"} aangemeld
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Nog niemand aangemeld
                </span>
              )}
            </div>

            {/* Expanded section */}
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
                    {/* Attendees */}
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

                    {/* Actions */}
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

      {/* RSVP modal */}
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
              <select
                className="input-field"
                {...rsvpForm.register("user_name")}
              >
                <option value="">Selecteer naam…</option>
                {userNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input-field"
                placeholder="Naam"
                {...rsvpForm.register("user_name")}
              />
            )}
            {rsvpForm.formState.errors.user_name && (
              <p className="mt-1.5 text-xs text-rose-500">
                {rsvpForm.formState.errors.user_name.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            loading={rsvpForm.formState.isSubmitting}
            className="w-full"
          >
            Aanmelding bevestigen
          </Button>
        </form>
      </Modal>

      {/* Cancel RSVP modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Aanmelding annuleren"
        description={meal.meal_name}
      >
        <form
          onSubmit={cancelForm.handleSubmit(onCancel)}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <select
              className="input-field"
              {...cancelForm.register("user_name")}
            >
              <option value="">Selecteer naam…</option>
              {meal.rsvps.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
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

      {/* Delete confirmation modal */}
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
    </>
  );
}

export function FoodPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: meals, isLoading } = useMeals();
  const { data: users } = useUsers();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreateMeal();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { transport_needed: false },
  });

  async function onCreate(values: CreateForm) {
    try {
      await createMutation.mutateAsync(values);
      reset();
      setCreateOpen(false);
      toast("success", `${values.meal_name} is toegevoegd!`);
    } catch {
      toast("error", "Kon het event niet toevoegen. Probeer opnieuw.");
    }
  }

  return (
    <div className="space-y-5">
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setCreateOpen(true)}
      >
        <Plus size={16} />
        Maaltijd toevoegen
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (meals ?? []).length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={36} />}
          title="Geen maaltijden"
          description="Voeg de eerste maaltijd of restaurantafspraak toe."
        />
      ) : (
        <motion.div
          className="space-y-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {(meals ?? []).map((meal) => (
            <MealCard key={meal.row_number} meal={meal} userNames={userNames} />
          ))}
        </motion.div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Maaltijd toevoegen"
        description="Plan een etentje of restaurantbezoek"
      >
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Naam
            </label>
            <input
              className="input-field"
              placeholder="Bijv. Ramen Night, Sushi met de gang"
              {...register("meal_name")}
            />
            {errors.meal_name && (
              <p className="mt-1.5 text-xs text-rose-500">
                {errors.meal_name.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Datum & tijd
            </label>
            <input
              type="datetime-local"
              className="input-field"
              {...register("time")}
            />
            {errors.time && (
              <p className="mt-1.5 text-xs text-rose-500">
                {errors.time.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Locatie (optioneel)
              </label>
              <input
                className="input-field"
                placeholder="Restaurant of adres"
                {...register("location")}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Kosten p.p. (optioneel)
              </label>
              <input
                className="input-field"
                placeholder="Bijv. €25"
                {...register("cost")}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 hover:border-sky-200 hover:bg-sky-50 transition-colors">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-sky-500"
              {...register("transport_needed")}
            />
            <div>
              <span className="text-sm font-semibold text-slate-700">
                Vervoer vanuit hotel nodig
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Zichtbaar op de kaart als blauwe badge
              </p>
            </div>
          </label>

          <Button type="submit" loading={isSubmitting} className="w-full">
            Maaltijd opslaan
          </Button>
        </form>
      </Modal>
    </div>
  );
}
