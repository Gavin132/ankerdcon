import { useState } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { EmptyState } from "../components/common/EmptyState";
import { MealCard } from "../components/food/MealCard";
import { useMeals, useCreateMeal } from "../hooks/useMeals";
import { useUsers } from "../hooks/useUsers";
import { toast } from "../store/toast.store";
import { listContainer } from "../utils/motion";

const createSchema = z.object({
  meal_name: z.string().min(1, "Verplicht"),
  time: z.string().min(1, "Verplicht"),
  location: z.string().optional(),
  cost: z.string().optional(),
  transport_needed: z.boolean().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

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
      <Button variant="secondary" className="w-full" onClick={() => setCreateOpen(true)}>
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
        <motion.div className="space-y-3" variants={listContainer} initial="hidden" animate="show">
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
              <p className="mt-1.5 text-xs text-rose-500">{errors.meal_name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Datum & tijd
            </label>
            <input type="datetime-local" className="input-field" {...register("time")} />
            {errors.time && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.time.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Locatie (optioneel)
              </label>
              <input className="input-field" placeholder="Restaurant of adres" {...register("location")} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                Kosten p.p. (optioneel)
              </label>
              <input className="input-field" placeholder="Bijv. €25" {...register("cost")} />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 hover:border-sky-200 hover:bg-sky-50 transition-colors">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-sky-500"
              {...register("transport_needed")}
            />
            <div>
              <span className="text-sm font-semibold text-slate-700">Vervoer vanuit hotel nodig</span>
              <p className="text-xs text-slate-400 mt-0.5">Zichtbaar op de kaart als blauwe badge</p>
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
