import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Plus, History, ChevronDown } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { LocationSearchInput } from "../components/common/LocationSearchInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Drawer } from "../components/common/Drawer";
import { EventPicker } from "../components/common/EventPicker";
import { MealCardSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { MealCard } from "../components/food/MealCard";
import { useMeals, useCreateMeal } from "../hooks/useMeals";
import { useCalendar } from "../hooks/useCalendar";
import { useUsers } from "../hooks/useUsers";
import { toast } from "../store/toast.store";
import { listContainer } from "../utils/motion";

const createSchema = z.object({
  meal_name: z.string().min(1, "Verplicht"),
  time: z.string().min(1, "Verplicht"),
  location: z.string().optional(),
  cost: z.string().optional(),
  transport_needed: z.boolean().optional(),
  linked_event_id: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  menu_url: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function isMealPast(time: string): boolean {
  const d = new Date(time.replace(" ", "T"));
  return !isNaN(d.getTime()) && d < new Date();
}

const SL = "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";
const SF = "space-y-4 rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] p-4";
const ST = "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3";

export function FoodPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [showPastMeals, setShowPastMeals] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { data: meals, isLoading } = useMeals();
  const { data: users } = useUsers();
  const { data: events = [] } = useCalendar();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreateMeal();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { transport_needed: false },
  });

  function handleClose() {
    setCreateOpen(false);
    setShowDetails(false);
    reset();
  }

  async function onCreate(values: CreateForm) {
    const payload = {
      ...values,
      linked_event_id: values.linked_event_id || undefined,
      description: values.description || undefined,
      website: values.website || undefined,
      menu_url: values.menu_url || undefined,
    };
    try {
      await createMutation.mutateAsync(payload);
      handleClose();
      toast("success", `${values.meal_name} is toegevoegd!`);
    } catch {
      toast("error", "Kon het event niet toevoegen. Probeer opnieuw.");
    }
  }

  const footer = (
    <Button
      type="submit"
      form="create-meal-form"
      loading={isSubmitting}
      className="w-full"
    >
      Maaltijd opslaan
    </Button>
  );

  return (
    <div className="space-y-5">
      <Button variant="secondary" className="w-full" onClick={() => setCreateOpen(true)}>
        <Plus size={16} />
        Maaltijd toevoegen
      </Button>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <MealCardSkeleton key={i} />)}
        </div>
      ) : (meals ?? []).length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={36} />}
          title="Geen maaltijden"
          description="Voeg de eerste maaltijd of restaurantafspraak toe."
        />
      ) : (() => {
        const upcomingMeals = (meals ?? []).filter((m) => !isMealPast(m.time));
        const pastMeals = (meals ?? []).filter((m) => isMealPast(m.time));
        return (
          <>
            {upcomingMeals.length === 0 ? (
              <EmptyState
                icon={<UtensilsCrossed size={36} />}
                title="Geen aankomende maaltijden"
                description="Alle maaltijden zijn al geweest. Bekijk de geschiedenis hieronder."
              />
            ) : (
              <motion.div className="space-y-3" variants={listContainer} initial="hidden" animate="show">
                {upcomingMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} userNames={userNames} />
                ))}
              </motion.div>
            )}

            {pastMeals.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPastMeals((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 min-h-[48px] text-sm font-semibold text-slate-500 hover:bg-slate-100 active:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <History size={14} />
                    Geschiedenis ({pastMeals.length})
                  </span>
                  <motion.div
                    animate={{ rotate: showPastMeals ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={14} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showPastMeals && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        className="mt-3 space-y-3"
                        variants={listContainer}
                        initial="hidden"
                        animate="show"
                      >
                        {pastMeals.map((meal) => (
                          <MealCard key={meal.id} meal={meal} userNames={userNames} />
                        ))}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        );
      })()}

      <Drawer
        open={createOpen}
        onClose={handleClose}
        title="Maaltijd toevoegen"
        subtitle="Plan een etentje of restaurantbezoek"
        footer={footer}
      >
        <form id="create-meal-form" onSubmit={handleSubmit(onCreate)} className="space-y-5">
          {/* Basisgegevens */}
          <div className={SF}>
            <p className={ST}>Basisgegevens</p>
            <div className="space-y-4">
              <div>
                <label className={SL}>Naam</label>
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
                <label className={SL}>Datum & tijd</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  {...register("time")}
                />
                {errors.time && (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.time.message}</p>
                )}
              </div>

              <div>
                <label className={SL}>Locatie</label>
                <Controller
                  name="location"
                  control={control}
                  render={({ field }) => (
                    <LocationSearchInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      inputClassName="input-field"
                      placeholder="Zoek restaurant of locatie…"
                    />
                  )}
                />
              </div>

              <div>
                <label className={SL}>Kosten p.p.</label>
                <input
                  className="input-field"
                  placeholder="Bijv. €25"
                  {...register("cost")}
                />
              </div>
            </div>
          </div>

          {/* Opties */}
          <div className={SF}>
            <p className={ST}>Opties</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-4 py-3 hover:border-sky-300 dark:hover:border-sky-500/40 hover:bg-sky-50 dark:hover:bg-sky-500/5 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-sky-500 shrink-0"
                {...register("transport_needed")}
              />
              <div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Vervoer vanuit hotel nodig
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Zichtbaar op de kaart als blauwe badge
                </p>
              </div>
            </label>

            {events.length > 0 && (
              <div>
                <label className={SL}>Koppel aan event</label>
                <Controller
                  name="linked_event_id"
                  control={control}
                  render={({ field }) => (
                    <EventPicker
                      events={events}
                      value={field.value || undefined}
                      onChange={(id) => {
                        field.onChange(id ?? "");
                        if (id) {
                          const event = events.find((e) => e.id === id);
                          if (event?.date) {
                            setValue("time", `${event.date}T12:00`, { shouldValidate: true });
                          }
                        }
                      }}
                      placeholder="Zoek en koppel een event…"
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* Details — collapsible */}
          <div className="rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Details (optioneel)
              </span>
              <motion.div
                animate={{ rotate: showDetails ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} className="text-slate-400" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 px-4 py-4 bg-slate-50 dark:bg-white/[0.03] border-t border-slate-100 dark:border-white/[0.06]">
                    <div>
                      <label className={SL}>Omschrijving</label>
                      <textarea
                        className="input-field resize-none"
                        rows={3}
                        placeholder="Korte beschrijving van het etentje..."
                        {...register("description")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={SL}>Website</label>
                        <input
                          className="input-field"
                          placeholder="https://..."
                          {...register("website")}
                        />
                      </div>
                      <div>
                        <label className={SL}>Menu URL</label>
                        <input
                          className="input-field"
                          placeholder="https://..."
                          {...register("menu_url")}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
