import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { useMeals, useCreateMeal, useRsvpMeal, useCancelRsvp } from "../hooks/useMeals";
import { formatDateTime } from "../utils/format";
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

function MealCard({ meal }: { meal: Meal }) {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const rsvpMutation = useRsvpMeal();
  const cancelMutation = useCancelRsvp();

  const rsvpForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const cancelForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });

  async function onRsvp(values: NameForm) {
    await rsvpMutation.mutateAsync({ rowNumber: meal.row_number, payload: values });
    rsvpForm.reset();
    setRsvpOpen(false);
  }

  async function onCancel(values: NameForm) {
    await cancelMutation.mutateAsync({ rowNumber: meal.row_number, payload: values });
    cancelForm.reset();
    setCancelOpen(false);
  }

  return (
    <>
      <motion.div variants={cardItem}>
        <div className="card-surface rounded-2xl overflow-hidden">
          {/* Top strip — amber for food */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                <UtensilsCrossed size={20} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <h3 className="font-black text-slate-900 text-sm">{meal.meal_name}</h3>
                  {meal.transport_needed && (
                    <Badge variant="blue">
                      <Bus size={11} />
                      Vervoer nodig
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <Clock size={11} className="text-amber-500" />
                    {formatDateTime(meal.time)}
                  </span>
                  {meal.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={11} className="text-slate-400" />
                      {meal.location}
                    </span>
                  )}
                  {meal.cost && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <Banknote size={11} />
                      {meal.cost}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* RSVP list */}
            {meal.rsvps.length > 0 && (
              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users size={11} className="text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Aanwezig ({meal.rsvps.length})
                  </span>
                </div>
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
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="primary" className="flex-1" onClick={() => setRsvpOpen(true)}>
                <UserCheck size={14} />
                RSVP
              </Button>
              {meal.rsvps.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}>
                  <UserMinus size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <Modal
        open={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        title={`RSVP — ${meal.meal_name}`}
        description={meal.location ?? undefined}
      >
        <form onSubmit={rsvpForm.handleSubmit(onRsvp)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <input className="input-field" placeholder="Naam" {...rsvpForm.register("user_name")} />
            {rsvpForm.formState.errors.user_name && (
              <p className="mt-1.5 text-xs text-rose-500">{rsvpForm.formState.errors.user_name.message}</p>
            )}
          </div>
          <Button type="submit" loading={rsvpForm.formState.isSubmitting} className="w-full">
            RSVP bevestigen
          </Button>
        </form>
      </Modal>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="RSVP annuleren">
        <form onSubmit={cancelForm.handleSubmit(onCancel)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Jouw naam
            </label>
            <input className="input-field" placeholder="Naam" {...cancelForm.register("user_name")} />
          </div>
          <Button type="submit" variant="danger" loading={cancelForm.formState.isSubmitting} className="w-full">
            RSVP annuleren
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function FoodPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: meals, isLoading } = useMeals();
  const createMutation = useCreateMeal();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<CreateForm>({
      resolver: zodResolver(createSchema),
      defaultValues: { transport_needed: false },
    });

  async function onCreate(values: CreateForm) {
    await createMutation.mutateAsync(values);
    reset();
    setCreateOpen(false);
  }

  if (isLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-5">
      <Button variant="secondary" className="w-full" onClick={() => setCreateOpen(true)}>
        <Plus size={16} />
        Maaltijd toevoegen
      </Button>

      {(meals ?? []).length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={36} />}
          title="Geen maaltijden"
          description="Voeg de eerste maaltijd of restaurantafspraak toe."
        />
      ) : (
        <motion.div className="space-y-3" variants={container} initial="hidden" animate="show">
          {(meals ?? []).map((meal) => (
            <MealCard key={meal.row_number} meal={meal} />
          ))}
        </motion.div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Maaltijd toevoegen" description="Plan een etentje of restaurantbezoek">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Naam</label>
            <input className="input-field" placeholder="Bijv. Ramen Night" {...register("meal_name")} />
            {errors.meal_name && <p className="mt-1.5 text-xs text-rose-500">{errors.meal_name.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Datum & tijd</label>
            <input type="datetime-local" className="input-field" {...register("time")} />
            {errors.time && <p className="mt-1.5 text-xs text-rose-500">{errors.time.message}</p>}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Locatie (optioneel)</label>
            <input className="input-field" placeholder="Restaurant naam of adres" {...register("location")} />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">Kosten per persoon (optioneel)</label>
            <input className="input-field" placeholder="Bijv. €25" {...register("cost")} />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 hover:border-sky-200 hover:bg-sky-50 transition-colors">
            <input type="checkbox" className="h-4 w-4 rounded accent-sky-500" {...register("transport_needed")} />
            <div>
              <span className="text-sm font-semibold text-slate-700">Vervoer vanuit hotel nodig</span>
              <p className="text-xs text-slate-400 mt-0.5">Markeer als deelnemers vervoer nodig hebben</p>
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
