import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Plus,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  History,
  Utensils,
  CalendarClock,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { LocationSearchInput } from "../components/common/LocationSearchInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { Drawer } from "../components/common/Drawer";
import { EventPicker } from "../components/common/EventPicker";
import { RideCardSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { NamePicker } from "../components/common/NamePicker";
import { RideCard } from "../components/transport/RideCard";
import { RestaurantCard } from "../components/transport/RestaurantCard";
import { RideTimeline } from "../components/transport/RideTimeline";
import { MealPicker } from "../components/common/MealPicker";
import { useRides, useCreateRide } from "../hooks/useRides";
import { useUsers } from "../hooks/useUsers";
import { useCalendar } from "../hooks/useCalendar";
import { useMeals } from "../hooks/useMeals";
import { toast } from "../store/toast.store";
import { getRideStatus } from "../utils/rides";
import type { Direction, VehicleType } from "../types";

const createSchema = z.object({
  direction: z.enum(["Inbound", "Outbound", "Restaurant"]),
  vehicle_type: z.enum(["Car", "Public Transport"]),
  driver: z.string().min(1, "Verplicht"),
  departure_time: z.string().min(1, "Verplicht"),
  start_location: z.string().min(1, "Verplicht"),
  end_location: z.string().optional(),
  total_seats: z.coerce.number().min(1).max(99),
  parking_info: z.string().optional(),
  car_available: z.boolean().optional(),
  action_required: z.boolean().optional(),
  linked_event_id: z.string().optional(),
  linked_meal_id: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

const SL = "block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5";
const SF = "space-y-4 rounded-2xl border border-slate-100 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] p-4";
const ST = "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

export function TransportPage() {
  const location = useLocation();
  const [tab, setTab] = useState<Direction>(
    (location.state as { tab?: Direction })?.tab ?? "Inbound",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const { data: rides, isLoading } = useRides();
  const { data: users } = useUsers();
  const { data: events = [] } = useCalendar();
  const { data: meals = [] } = useMeals();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreateRide();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      direction: "Inbound",
      vehicle_type: "Car",
      total_seats: 5,
    },
  });

  const vehicleType = watch("vehicle_type");
  const formDirection = watch("direction");

  useEffect(() => {
    if (vehicleType === "Public Transport" || formDirection === "Restaurant") {
      setValue("total_seats", 99);
    }
    if (formDirection === "Restaurant") {
      setValue("action_required", true);
    }
  }, [vehicleType, formDirection, setValue]);

  const allFiltered = (rides ?? []).filter((r) => r.direction === tab);
  const activeRides = allFiltered.filter(
    (r) => getRideStatus(r.departure_time).status !== "past",
  );
  const pastRides = allFiltered
    .filter((r) => getRideStatus(r.departure_time).status === "past")
    .sort(
      (a, b) =>
        new Date(b.departure_time.replace(" ", "T")).getTime() -
        new Date(a.departure_time.replace(" ", "T")).getTime(),
    );

  function openCreate() {
    reset({ direction: tab, vehicle_type: "Car", total_seats: 5 });
    setCreateOpen(true);
  }

  function handleClose() {
    setCreateOpen(false);
    reset();
  }

  async function onCreate(values: CreateForm) {
    try {
      await createMutation.mutateAsync({
        direction: values.direction as Direction,
        vehicle_type: values.vehicle_type as VehicleType,
        driver: values.driver,
        departure_time: values.departure_time,
        start_location: values.start_location,
        end_location: values.end_location || undefined,
        total_seats: values.total_seats,
        parking_info: values.parking_info ?? "",
        car_available: values.car_available ?? false,
        action_required: values.action_required ?? false,
        linked_event_id: values.linked_event_id || undefined,
        linked_meal_id: values.linked_meal_id || undefined,
      });
      handleClose();
      toast("success", "Rit toegevoegd aan het schema!");
    } catch {
      toast("error", "Kon de rit niet toevoegen. Probeer opnieuw.");
    }
  }

  const footer = (
    <Button
      type="submit"
      form="create-ride-form"
      loading={isSubmitting}
      className="w-full"
    >
      Rit opslaan
    </Button>
  );

  return (
    <div className="space-y-5">
      {/* Direction tabs + timeline toggle */}
      <div className="flex gap-2">
        <div className="flex flex-1 gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
          {(["Inbound", "Outbound", "Restaurant"] as const).map((d) => (
            <button
              key={d}
              onClick={() => { setTab(d); setShowTimeline(false); }}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${tab === d && !showTimeline
                ? "bg-white text-slate-900 shadow-card dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              {d === "Inbound" && <ArrowRight size={13} className={tab === d && !showTimeline ? "text-sky-500" : ""} />}
              {d === "Outbound" && <ArrowLeft size={13} className={tab === d && !showTimeline ? "text-sky-500" : ""} />}
              {d === "Restaurant" && <Utensils size={13} className={tab === d && !showTimeline ? "text-amber-500" : ""} />}
              {d === "Inbound" ? "Heen" : d === "Outbound" ? "Terug" : "Restaurant"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowTimeline((v) => !v)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all ${showTimeline
            ? "bg-sky-500 text-white shadow-card"
            : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          title="Tijdlijn"
        >
          <CalendarClock size={16} />
        </button>
      </div>

      {/* Add button */}
      <Button variant="secondary" className="w-full" onClick={openCreate}>
        <Plus size={16} />
        Rit toevoegen
      </Button>

      {/* Timeline view */}
      {showTimeline && (
        <RideTimeline rides={rides ?? []} />
      )}

      {/* Tab content */}
      {!showTimeline && (isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <RideCardSkeleton key={i} />)}
        </div>
      ) : allFiltered.length === 0 ? (
        <EmptyState
          icon={<Car size={36} />}
          title="Geen ritten gepland"
          description={`Er zijn nog geen ${tab === "Inbound" ? "heenritten" : tab === "Outbound" ? "terugritten" : "restaurantritten"} toegevoegd.`}
        />
      ) : (
        <>
          {activeRides.length === 0 ? (
            <EmptyState
              icon={<Car size={36} />}
              title="Geen actieve ritten"
              description="Alle ritten zijn al vertrokken. Bekijk de geschiedenis hieronder."
            />
          ) : (
            <motion.div
              key={tab}
              className="space-y-3"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {activeRides.map((ride) =>
                ride.direction === "Restaurant" ? (
                  <RestaurantCard key={ride.id} ride={ride} userNames={userNames} />
                ) : (
                  <RideCard key={ride.id} ride={ride} userNames={userNames} />
                ),
              )}
            </motion.div>
          )}

          {pastRides.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 min-h-[48px] text-sm font-semibold text-slate-500 hover:bg-slate-100 active:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-2">
                  <History size={14} />
                  Geschiedenis ({pastRides.length})
                </span>
                <motion.div
                  animate={{ rotate: showHistory ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      className="mt-3 space-y-3"
                      variants={container}
                      initial="hidden"
                      animate="show"
                    >
                      {pastRides.map((ride) =>
                        ride.direction === "Restaurant" ? (
                          <RestaurantCard key={ride.id} ride={ride} userNames={userNames} />
                        ) : (
                          <RideCard key={ride.id} ride={ride} userNames={userNames} />
                        ),
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      ))}

      {/* Create drawer */}
      <Drawer
        open={createOpen}
        onClose={handleClose}
        title="Rit toevoegen"
        subtitle="Vul de details van de rit in"
        footer={footer}
      >
        <form id="create-ride-form" onSubmit={handleSubmit(onCreate)} className="space-y-5">

          {/* Type & richting */}
          <div className={SF}>
            <p className={ST}>Type & richting</p>
            <div className={`grid gap-3 ${formDirection === "Restaurant" ? "grid-cols-1" : "grid-cols-2"}`}>
              <div>
                <label className={SL}>Richting</label>
                <select className="input-field dark:[color-scheme:dark]" {...register("direction")}>
                  <option value="Inbound">Heen</option>
                  <option value="Outbound">Terug</option>
                  <option value="Restaurant">Restaurant</option>
                </select>
              </div>
              {formDirection !== "Restaurant" && (
                <div>
                  <label className={SL}>Type</label>
                  <select className="input-field dark:[color-scheme:dark]" {...register("vehicle_type")}>
                    <option value="Car">Auto</option>
                    <option value="Public Transport">Openbaar Vervoer</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Chauffeur */}
          <div className={SF}>
            <p className={ST}>
              {formDirection === "Restaurant" ? "Organisator" : vehicleType === "Car" ? "Chauffeur" : "Vervoerder"}
            </p>
            {vehicleType === "Car" || formDirection === "Restaurant" ? (
              <NamePicker
                options={userNames}
                value={watch("driver") ?? ""}
                onChange={(v) => setValue("driver", v)}
                placeholder="Zoek naam…"
              />
            ) : (
              <input
                className="input-field"
                placeholder="Bijv. NS Intercity"
                autoComplete="off"
                {...register("driver")}
              />
            )}
            {errors.driver && (
              <p className="mt-1.5 text-xs text-rose-500">{errors.driver.message}</p>
            )}
          </div>

          {/* Vertrektijd & zitplaatsen */}
          <div className={SF}>
            <p className={ST}>Timing</p>
            <div className={`grid gap-3 ${vehicleType === "Public Transport" || formDirection === "Restaurant" ? "grid-cols-1" : "grid-cols-2"}`}>
              <div>
                <label className={SL}>Vertrektijd</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  {...register("departure_time")}
                />
                {errors.departure_time && (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.departure_time.message}</p>
                )}
              </div>
              {vehicleType !== "Public Transport" && formDirection !== "Restaurant" && (
                <div>
                  <label className={SL}>Zitplaatsen</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="input-field"
                    {...register("total_seats")}
                  />
                  <p className="mt-1 text-xs text-slate-400">Incl. bestuurder</p>
                </div>
              )}
            </div>
          </div>

          {/* Route */}
          <div className={SF}>
            <p className={ST}>{formDirection === "Restaurant" ? "Locatie" : "Route"}</p>
            <div>
              <label className={SL}>
                {formDirection === "Restaurant" ? "Restaurant / locatie" : "Vertrekpunt"}
              </label>
              <Controller
                name="start_location"
                control={control}
                render={({ field }) => (
                  <LocationSearchInput
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    inputClassName="input-field"
                    placeholder={
                      formDirection === "Restaurant"
                        ? "Zoek restaurant of locatie…"
                        : "Zoek vertrekpunt…"
                    }
                  />
                )}
              />
              {errors.start_location && (
                <p className="mt-1.5 text-xs text-rose-500">{errors.start_location.message}</p>
              )}
            </div>
            {formDirection !== "Restaurant" && (
              <div>
                <label className={SL}>Bestemming (optioneel)</label>
                <Controller
                  name="end_location"
                  control={control}
                  render={({ field }) => (
                    <LocationSearchInput
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      inputClassName="input-field"
                      placeholder="Zoek bestemming…"
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* Event / etentje koppeling */}
          {formDirection === "Restaurant" ? (
            meals.length > 0 && (
              <div className={SF}>
                <p className={ST}>Koppel aan etentje</p>
                <Controller
                  name="linked_meal_id"
                  control={control}
                  render={({ field }) => (
                    <MealPicker
                      meals={meals}
                      value={field.value || undefined}
                      onChange={(id) => {
                        field.onChange(id ?? "");
                        if (id) {
                          const meal = meals.find((m) => m.id === id);
                          if (meal?.time) {
                            const d = new Date(meal.time);
                            if (!isNaN(d.getTime())) {
                              const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                                .toISOString()
                                .slice(0, 16);
                              setValue("departure_time", local, { shouldValidate: true });
                            }
                          }
                          if (meal?.location) setValue("start_location", meal.location, { shouldValidate: true });
                          if (meal?.parking_info) setValue("parking_info", meal.parking_info, { shouldValidate: true });
                        }
                      }}
                    />
                  )}
                />
              </div>
            )
          ) : (
            events.length > 0 && (
              <div className={SF}>
                <p className={ST}>Koppel aan event</p>
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
                          if (event?.location) setValue("end_location", event.location, { shouldValidate: true });
                          if (event?.parking_info) setValue("parking_info", event.parking_info, { shouldValidate: true });
                        }
                      }}
                      placeholder="Zoek en koppel een event…"
                    />
                  )}
                />
              </div>
            )
          )}

          {/* Restaurant opties */}
          {formDirection === "Restaurant" && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
              <p className={`${ST} text-amber-600 dark:text-amber-400`}>Restaurant opties</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-amber-500 shrink-0"
                  {...register("action_required")}
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Actie vereist
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">Reageer verplicht voor deelname</p>
                </div>
              </label>
            </div>
          )}

          {/* Parkeerinfo */}
          {vehicleType === "Car" && formDirection !== "Restaurant" && (
            <div className={SF}>
              <p className={ST}>Parkeren (optioneel)</p>
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="Bijv. P2 niveau 1, vak A4. Druk op de groene knop bij de slagboom."
                {...register("parking_info")}
              />
            </div>
          )}
        </form>
      </Drawer>
    </div>
  );
}
