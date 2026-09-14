import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Plus, History, ChevronDown } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { LocationSearchInput } from "../../components/common/LocationSearchInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/common/Button";
import { StickyActionBar } from "../../components/common/StickyActionBar";
import { Drawer } from "../../components/common/Drawer";
import { EventPicker } from "../../components/common/EventPicker";
import { MealCardSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { MealCard } from "../../components/food/MealCard";
import { useMeals, useCreateMeal } from "../../hooks/useMeals";
import { useCalendar } from "../../hooks/useCalendar";
import { useUsers } from "../../hooks/useUsers";
import { toast } from "../../store/toast.store";
import { listContainer } from "../../utils/motion";
import { useTimeStore, getNow } from "../../store/time.store";
import { parseEventDate, toDateKey, todayKey } from "../../utils/date";
import { isTripOver, tripGaps, tripMeals } from "../../utils/trips";
import { useRides } from "../../hooks/useRides";
import { TripMissingList } from "../../components/trip/TripMissingList";
import { useTrip } from "./tripContext";

const createSchema = z.object({
  meal_name: z.string().min(1, "Verplicht"),
  linked_event_id: z.string().min(1, "Verplicht"),
  meal_time: z.string().min(1, "Verplicht"),
  location: z.string().optional(),
  cost: z.string().optional(),
  transport_needed: z.boolean().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  menu_url: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function isMealPast(time: string): boolean {
  const d = new Date(time.replace(" ", "T"));
  return !isNaN(d.getTime()) && d < getNow();
}

const SL = "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";
const SF = "space-y-4 rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] p-4";
const ST = "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3";

/** Event › Eten: this trip's meals, plus who on the trip isn't eating along yet. */
export function TripFoodTab() {
  const { trip, dayId } = useTrip();
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const [createOpen, setCreateOpen] = useState(false);
  const [showPastMeals, setShowPastMeals] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { data: allMeals = [], isLoading } = useMeals();
  const { data: rides = [] } = useRides();
  const meals = tripMeals(allMeals, trip, dayId);
  const missingFood = isTripOver(trip) ? [] : tripGaps(trip, rides, allMeals).food;
  const { data: users } = useUsers();
  const { data: events = [] } = useCalendar();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreateMeal();

  // Linking a meal to an event only makes sense for something still coming
  // up — a past event's date isn't a useful default for a new meal plan. New
  // meals go to a day of this trip; only a trip that's already over falls
  // back to every upcoming event.
  const todayStr = todayKey();
  const isUpcoming = (date: string) => {
    const d = parseEventDate(date);
    return !!d && toDateKey(d) >= todayStr;
  };
  const upcomingTripDays = trip.days.filter((d) => isUpcoming(d.ev.date)).map((d) => d.ev);
  const upcomingEvents = upcomingTripDays.length > 0 ? upcomingTripDays : events.filter((e) => isUpcoming(e.date));

  function openCreate() {
    const defaultDay = upcomingTripDays.find((d) => d.id === dayId) ?? upcomingTripDays[0];
    reset({ transport_needed: false, linked_event_id: defaultDay?.id ?? "" });
    setCreateOpen(true);
  }

  const {
    register,
    handleSubmit,
    reset,
    control,
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
    const linkedEvent = events.find((e) => e.id === values.linked_event_id);
    const eventDate = linkedEvent ? parseEventDate(linkedEvent.date) : null;
    const dateKey = eventDate ? toDateKey(eventDate) : "";
    const payload = {
      meal_name: values.meal_name,
      time: `${dateKey}T${values.meal_time}`,
      location: values.location,
      cost: values.cost,
      transport_needed: values.transport_needed,
      linked_event_id: values.linked_event_id,
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
    <div className="space-y-5 pb-20">
      <TripMissingList
        title="Eet nog niet mee"
        people={missingFood.map((name) => ({ name }))}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <MealCardSkeleton key={i} />)}
        </div>
      ) : meals.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={36} />}
          title="Geen maaltijden"
          description="Er is nog geen maaltijd of restaurant gepland voor dit event."
        />
      ) : (() => {
        const byTime = (a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time);
        const upcomingMeals = meals.filter((m) => !isMealPast(m.time)).sort(byTime);
        const pastMeals = meals.filter((m) => isMealPast(m.time)).sort((a, b) => byTime(b, a));
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

      <StickyActionBar>
        <Button className="w-full shadow-lg" onClick={openCreate}>
          <Plus size={16} />
          Maaltijd toevoegen
        </Button>
      </StickyActionBar>

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
                <label className={SL}>Event</label>
                <Controller
                  name="linked_event_id"
                  control={control}
                  render={({ field }) => (
                    <EventPicker
                      events={upcomingEvents}
                      value={field.value || undefined}
                      onChange={(id) => field.onChange(id ?? "")}
                      placeholder="Zoek en koppel een event…"
                    />
                  )}
                />
                <p className="mt-1.5 text-xs text-slate-400">De datum van het etentje volgt uit het event.</p>
                {errors.linked_event_id && (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.linked_event_id.message}</p>
                )}
              </div>

              <div>
                <label className={SL}>Tijd</label>
                <input
                  type="time"
                  className="input-field"
                  {...register("meal_time")}
                />
                {errors.meal_time && (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.meal_time.message}</p>
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

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-4 py-3 hover:border-sky-300 dark:hover:border-sky-500/40 hover:bg-sky-50 dark:hover:bg-sky-500/5 transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-sky-500 shrink-0"
                  {...register("transport_needed")}
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Autovervoer nodig
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zichtbaar op de kaart als blauwe badge
                  </p>
                </div>
              </label>
            </div>
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
