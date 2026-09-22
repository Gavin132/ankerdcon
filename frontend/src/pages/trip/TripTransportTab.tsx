import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  History,
  Utensils,
  CalendarClock,
  X as XIcon,
  Trash2,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { LocationSearchInput } from "../../components/common/LocationSearchInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/common/Button";
import { TripSheet } from "../../components/trip/TripSheet";
import { DayChips } from "../../components/trip/DayChips";
import { RideCardSkeleton } from "../../components/common/Skeleton";
import { NamePicker } from "../../components/common/NamePicker";
import { RideCard } from "../../components/transport/RideCard";
import { RestaurantMealPrompt, RestaurantRideGroup } from "../../components/transport/RestaurantRideGroup";
import { RideTimeline } from "../../components/transport/RideTimeline";
import { useRides, useCreateRide, useDeleteRide } from "../../hooks/useRides";
import { useUsers, useCurrentUser } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { useMeals } from "../../hooks/useMeals";
import { toast } from "../../store/toast.store";
import { getRideStatus } from "../../utils/rides";
import { toDateKey, todayKey, parseEventDate, splitDateTime } from "../../utils/date";
import { useTimeStore } from "../../store/time.store";
import { defaultTripDayId, isTripOver, tripGaps, tripRides } from "../../utils/trips";
import { TripMissingList } from "../../components/trip/TripMissingList";
import { useTrip } from "./tripContext";
import type { Direction, Ride } from "../../types";

const createSchema = z
  .object({
    direction: z.enum(["Inbound", "Outbound", "Restaurant"]),
    driver: z.string().optional(),
    linked_event_id: z.string().optional(),
    linked_meal_id: z.string().optional(),
    ride_time: z.string().optional(),
    departure_time: z.string().optional(),
    start_location: z.string().min(1, "Verplicht"),
    end_location: z.string().optional(),
    total_seats: z.coerce.number().min(1).max(99),
    parking_info: z.string().optional(),
    car_available: z.boolean().optional(),
    action_required: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.driver?.trim()) {
      ctx.addIssue({ path: ["driver"], code: z.ZodIssueCode.custom, message: "Verplicht" });
    }
    if (data.direction === "Restaurant") {
      if (!data.departure_time) {
        ctx.addIssue({ path: ["departure_time"], code: z.ZodIssueCode.custom, message: "Verplicht" });
      }
    } else {
      if (!data.linked_event_id) {
        ctx.addIssue({ path: ["linked_event_id"], code: z.ZodIssueCode.custom, message: "Verplicht" });
      }
      if (!data.ride_time) {
        ctx.addIssue({ path: ["ride_time"], code: z.ZodIssueCode.custom, message: "Verplicht" });
      }
    }
  });

type CreateForm = z.infer<typeof createSchema>;

const SL = "section-label mb-1.5 block";
const SF = "space-y-4 rounded-xl border-1.5 border-line bg-sunken p-4";
const ST = "section-label mb-3";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const DIRECTION_ORDER: Direction[] = ["Inbound", "Outbound", "Restaurant"];

const DIRECTION_LABEL: Record<Direction, string> = {
  Inbound: "Heen",
  Outbound: "Terug",
  Restaurant: "Restaurant",
};

const DIRECTION_ICON: Record<Direction, React.ReactNode> = {
  Inbound: <ArrowRight size={12} className="shrink-0" />,
  Outbound: <ArrowLeft size={12} className="shrink-0" />,
  Restaurant: <Utensils size={12} className="shrink-0" />,
};

/**
 * Event › Vervoer, opened as a bottom sheet over Overzicht. Rides are
 * organised by day first (the day chips are right here in the sheet) and by
 * direction within a day. When a specific day is picked, its Heen/Terug/
 * Restaurant groups show flat, no accordion needed for just one day; on
 * "Alle dagen" each day becomes its own collapsible section, nearest day
 * open by default. Adding a ride slides the sheet to its own form view
 * instead of stacking a second overlay on top.
 */
export function TripTransportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { trip, dayId, setDayId } = useTrip();
  const location = useLocation();
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const [view, setView] = useState<"list" | "form">("list");
  const [showTimeline, setShowTimeline] = useState(false);
  const [openDayIds, setOpenDayIds] = useState<Set<string>>(() => new Set([defaultTripDayId(trip)]));
  const [historyOpenIds, setHistoryOpenIds] = useState<Set<string>>(new Set());
  const { data: allRides, isLoading } = useRides();
  const { data: users } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const { data: events = [] } = useCalendar();
  const { data: meals = [] } = useMeals();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreateRide();
  const deleteMutation = useDeleteRide();
  const [confirmDeleteRideId, setConfirmDeleteRideId] = useState<string | null>(null);

  async function handleDeleteRide(ride: Ride) {
    try {
      await deleteMutation.mutateAsync(ride.id);
      setConfirmDeleteRideId(null);
      toast("success", "Rit verwijderd.");
    } catch {
      toast("error", "Kon de rit niet verwijderen. Probeer opnieuw.");
    }
  }

  const rides = tripRides(allRides ?? [], meals, trip, dayId);
  const gaps = tripGaps(trip, allRides ?? [], meals);
  const missingPeople = gaps.transport.map((g) => ({ name: g.name, detail: g.items.join(" & ") }));
  const tripMealIds = new Set(meals.filter((m) => m.linked_event_id && trip.eventIds.includes(m.linked_event_id)).map((m) => m.id));
  const tripMealOptions = meals.filter((m) => tripMealIds.has(m.id));

  // A day the trip's gap list attributes a missing Heen applies to the
  // trip's first day, missing Terug to its last — that's the only day each
  // one is ever actually resolved on.
  const firstDayId = trip.days[0]?.ev.id;
  const lastDayId = trip.days[trip.days.length - 1]?.ev.id;
  const dayNeedsAttention = (id: string) =>
    (id === firstDayId && gaps.transport.some((g) => g.items.includes("Heen"))) ||
    (id === lastDayId && gaps.transport.some((g) => g.items.includes("Terug")));

  // Linking a ride to an event only makes sense for something still coming
  // up — a past event's date isn't a useful default for a new ride. New rides
  // go to a day of this trip; only a trip that's already over falls back to
  // every upcoming event.
  const todayStr = todayKey();
  const isUpcoming = (date: string) => {
    const d = parseEventDate(date);
    return !!d && toDateKey(d) >= todayStr;
  };
  const upcomingTripDays = trip.days.filter((d) => isUpcoming(d.ev.date)).map((d) => d.ev);

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
      total_seats: 5,
    },
  });

  const formDirection = watch("direction");

  useEffect(() => {
    if (formDirection === "Restaurant") {
      setValue("total_seats", 99);
      setValue("action_required", true);
    }
  }, [formDirection, setValue]);

  useEffect(() => {
    // Opening the sheet straight from elsewhere (e.g. the Hub's restaurant
    // rides prompt) can ask a specific direction's form to pop right open.
    if (!open) return;
    const state = location.state as { tab?: Direction } | null;
    if (state?.tab) openCreate(state.tab, dayId ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleDay(id: string) {
    setOpenDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleHistory(key: string) {
    setHistoryOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openCreate(direction: Direction = "Inbound", explicitDayId?: string) {
    const defaultDay = upcomingTripDays.find((d) => d.id === (explicitDayId ?? dayId)) ?? upcomingTripDays[0];
    // The meal a new restaurant ride links to by default — whichever of this
    // day's etentjes comes first; falls back to the trip's next one if this
    // day doesn't have one of its own yet.
    const dayMeals = tripMealOptions
      .filter((m) => m.linked_event_id === defaultDay?.id)
      .sort((a, b) => a.time.localeCompare(b.time));
    const defaultMeal = dayMeals[0] ?? tripMealOptions[0];
    reset({
      direction,
      total_seats: 5,
      driver: currentUser?.name ?? "",
      linked_event_id: direction === "Restaurant" ? undefined : defaultDay?.id,
      linked_meal_id: direction === "Restaurant" ? defaultMeal?.id : undefined,
      start_location: direction === "Outbound" ? defaultDay?.location ?? "" : "",
      end_location: direction === "Inbound" ? defaultDay?.location ?? "" : direction === "Restaurant" ? defaultMeal?.location ?? "" : "",
      parking_info: defaultDay?.parking_info ?? "",
      departure_time: direction === "Restaurant"
        ? `${toDateKey(parseEventDate(defaultDay?.date ?? "") ?? new Date())}T${defaultMeal ? splitDateTime(defaultMeal.time)[1] : "18:00"}`
        : undefined,
    });
    setView("form");
  }

  async function onCreate(values: CreateForm) {
    const departureTime = (() => {
      if (values.direction === "Restaurant") return values.departure_time!;
      const linkedEvent = events.find((e) => e.id === values.linked_event_id);
      const eventDate = linkedEvent ? parseEventDate(linkedEvent.date) : null;
      const dateKey = eventDate ? toDateKey(eventDate) : "";
      return `${dateKey}T${values.ride_time}`;
    })();
    try {
      await createMutation.mutateAsync({
        direction: values.direction as Direction,
        vehicle_type: "Car",
        driver: values.driver ?? "",
        departure_time: departureTime,
        start_location: values.start_location,
        end_location: values.end_location || undefined,
        total_seats: values.total_seats,
        parking_info: values.parking_info ?? "",
        car_available: values.car_available ?? false,
        action_required: values.action_required ?? false,
        linked_event_id: values.linked_event_id || undefined,
        linked_meal_id: values.linked_meal_id || undefined,
      });
      reset();
      setView("list");
      toast("success", "Rit toegevoegd aan het schema!");
    } catch {
      toast("error", "Kon de rit niet toevoegen. Probeer opnieuw.");
    }
  }

  /** One direction's rides within an already day-scoped ride list. */
  function renderDirectionGroup(direction: Direction, dayRides: Ride[], targetDayId?: string) {
    const all = dayRides.filter((r) => r.direction === direction);
    const active = all.filter((r) => getRideStatus(r.departure_time).status !== "past");
    // Restaurant rides are created from the meal ("Ik rijd" on a meal that has no ride yet).
    const restaurantDayId = targetDayId ?? dayId;
    const mealsWithoutRide = direction === "Restaurant"
      ? tripMealOptions.filter(
          (m) =>
            m.transport_needed &&
            (!restaurantDayId || m.linked_event_id === restaurantDayId) &&
            !(allRides ?? []).some((r) => r.direction === "Restaurant" && r.linked_meal_id === m.id),
        )
      : [];

    // Someone can only be the driver of one ride per direction per day — once
    // they've made one, "Ik rijd" would just be confusing (or invite a second,
    // duplicate ride), so it turns into a way to take that ride back instead.
    const myRide = active.find((r) => r.driver === currentUser?.name);
    const myRideOtherPassengers = myRide ? myRide.passengers.filter((p) => p !== myRide.driver).length : 0;

    return (
      <div key={direction}>
        <div className="mb-2 flex items-center gap-1.5">
          {DIRECTION_ICON[direction]}
          <span className="section-label">{DIRECTION_LABEL[direction]}</span>
          <span className="font-mono text-[11px] tabular-nums text-ink-3">{active.length}</span>
          {direction !== "Restaurant" && !isTripOver(trip) && !myRide && (
            <button
              type="button"
              onClick={() => openCreate(direction, targetDayId)}
              className="btn-primary ml-auto h-8 px-3 text-xs"
            >
              <Car size={13} /> Ik rijd
            </button>
          )}
          {direction !== "Restaurant" && !isTripOver(trip) && myRide && (
            confirmDeleteRideId === myRide.id ? (
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteRideId(null)}
                  className="h-8 rounded-lg px-2 text-xs font-semibold text-ink-2 hover:text-ink"
                >
                  Annuleer
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => handleDeleteRide(myRide)}
                  className="flex h-8 items-center gap-1 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                >
                  <Trash2 size={13} /> Zeker weten?
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteRideId(myRide.id)}
                className="ml-auto flex h-8 items-center gap-1 rounded-lg border-1.5 border-line px-3 text-xs font-semibold text-ink-2 transition-colors hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
              >
                <Trash2 size={13} /> Rit verwijderen
              </button>
            )
          )}
        </div>
        {myRide && confirmDeleteRideId === myRide.id && myRideOtherPassengers > 0 && (
          <p className="-mt-1 mb-2 text-[11.5px] text-rose-600 dark:text-rose-400">
            {myRideOtherPassengers === 1
              ? "Er is al iemand bij deze rit ingedeeld — die persoon verliest zijn plek."
              : `Er zijn al ${myRideOtherPassengers} mensen bij deze rit ingedeeld — zij verliezen hun plek.`}
          </p>
        )}
        {active.length === 0 && mealsWithoutRide.length === 0 ? (
          <p className="py-1 text-xs text-ink-3">
            Nog geen {direction === "Restaurant" ? "route" : "rit"}.
          </p>
        ) : (
          <motion.div className="space-y-2.5" variants={container} initial="hidden" animate="show">
            {mealsWithoutRide.map((m) => <RestaurantMealPrompt key={m.id} meal={m} />)}
            {active.map((ride) =>
              ride.direction === "Restaurant" ? (
                <RestaurantRideGroup key={ride.id} ride={ride} userNames={userNames} />
              ) : (
                <RideCard key={ride.id} ride={ride} userNames={userNames} />
              ),
            )}
          </motion.div>
        )}
      </div>
    );
  }

  /** All three direction groups for one day, plus that day's own history toggle. */
  function renderDayContent(dayRides: Ride[], historyKey: string, targetDayId?: string) {
    const past = dayRides.filter((r) => getRideStatus(r.departure_time).status === "past");
    const historyOpen = historyOpenIds.has(historyKey);

    // No restaurant section on a day without a mealplan (unless a restaurant ride already exists).
    const mealDayId = targetDayId ?? dayId;
    const hasMealplan = tripMealOptions.some((m) => !mealDayId || m.linked_event_id === mealDayId);
    const hasRestaurantRide = dayRides.some((r) => r.direction === "Restaurant");
    const directions = DIRECTION_ORDER.filter((d) => d !== "Restaurant" || hasMealplan || hasRestaurantRide);

    return (
      <div className="space-y-4">
        <div className={`grid gap-4 ${directions.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
          {directions.map((d) => renderDirectionGroup(d, dayRides, targetDayId))}
        </div>
        {past.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => toggleHistory(historyKey)}
              aria-expanded={historyOpen}
              className="flex min-h-[40px] items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-ink"
            >
              <History size={13} />
              Geschiedenis <span className="font-mono tabular-nums">({past.length})</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${historyOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2.5 opacity-60">
                    {past.map((ride) =>
                      ride.direction === "Restaurant" ? (
                        <RestaurantRideGroup key={ride.id} ride={ride} userNames={userNames} />
                      ) : (
                        <RideCard key={ride.id} ride={ride} userNames={userNames} />
                      ),
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  const formFooter = (
    <Button type="submit" form="create-ride-form" loading={isSubmitting} className="w-full">
      {formDirection === "Restaurant" ? "Route opslaan" : "Rit opslaan"}
    </Button>
  );

  return (
    <TripSheet
      open={open}
      onClose={onClose}
      viewKey={view}
      onBack={view === "form" ? () => setView("list") : undefined}
      title={view === "form" ? (formDirection === "Restaurant" ? "Route toevoegen" : "Rit toevoegen") : "Vervoer"}
      subtitle={
        view === "form"
          ? formDirection === "Restaurant"
            ? "Zet tijd en locatie neer — pas als iemand “Ik rijd” aangeeft, is er echt een rit"
            : "Vul de details van de rit in"
          : undefined
      }
      footer={view === "form" ? formFooter : undefined}
    >
      {view === "form" ? (
        <form id="create-ride-form" onSubmit={handleSubmit(onCreate)} className="space-y-5">
          {/* Richting en event/etentje komen uit welke "+" is aangeklikt — dat is al
              duidelijk uit de sectie en dag waar de rit vandaan komt, dus geen keuze
              meer hier. */}

          {/* Chauffeur — defaults to jezelf, maar kan verwijderd worden als je de rit voor iemand anders aanmaakt */}
          <div className={SF}>
            <p className={ST}>{formDirection === "Restaurant" ? "Organisator" : "Chauffeur"}</p>
            <div className="relative">
              <NamePicker
                options={userNames}
                value={watch("driver") ?? ""}
                onChange={(v) => setValue("driver", v, { shouldValidate: true })}
                placeholder="Zoek naam…"
              />
              {watch("driver") && (
                <button
                  type="button"
                  onClick={() => setValue("driver", "", { shouldValidate: true })}
                  className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                  title="Chauffeur verwijderen"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>
            {errors.driver && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.driver.message}</p>
            )}
          </div>

          {/* Vertrektijd & zitplaatsen */}
          <div className={SF}>
            <p className={ST}>Timing</p>
            <div className={`grid gap-3 ${formDirection === "Restaurant" ? "grid-cols-1" : "grid-cols-2"}`}>
              <div>
                <label className={SL}>{formDirection === "Restaurant" ? "Vertrektijd" : "Tijd"}</label>
                {formDirection === "Restaurant" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="input-field"
                      value={splitDateTime(watch("departure_time") ?? "")[0]}
                      onChange={(e) => {
                        const time = splitDateTime(watch("departure_time") ?? "")[1] || "09:00";
                        setValue("departure_time", `${e.target.value}T${time}`, { shouldValidate: true });
                      }}
                    />
                    <input
                      type="time"
                      className="input-field"
                      value={splitDateTime(watch("departure_time") ?? "")[1]}
                      onChange={(e) => {
                        const date = splitDateTime(watch("departure_time") ?? "")[0];
                        setValue("departure_time", `${date}T${e.target.value}`, { shouldValidate: true });
                      }}
                    />
                  </div>
                ) : (
                  <input type="time" className="input-field" {...register("ride_time")} />
                )}
                {(errors.departure_time || errors.ride_time) && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                    {(errors.departure_time ?? errors.ride_time)?.message}
                  </p>
                )}
              </div>
              {formDirection !== "Restaurant" && (
                <div>
                  <label className={SL}>Plekken in de auto</label>
                  <input type="number" min={1} max={99} className="input-field" {...register("total_seats")} />
                  <p className="mt-1 text-xs text-ink-3">Incl. bestuurder</p>
                </div>
              )}
            </div>
          </div>

          {/* Route */}
          <div className={SF}>
            <p className={ST}>{formDirection === "Restaurant" ? "Vertrek" : "Route"}</p>
            <div>
              <label className={SL}>Vertrekpunt</label>
              <Controller
                name="start_location"
                control={control}
                render={({ field }) => (
                  <LocationSearchInput
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    inputClassName="input-field"
                    placeholder="Zoek vertrekpunt…"
                  />
                )}
              />
              {errors.start_location && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.start_location.message}</p>
              )}
              {formDirection === "Restaurant" && (
                <p className="mt-1.5 text-xs text-ink-3">
                  Waar vertrekt deze rit vandaan? De bestemming (het restaurant) is al ingevuld vanuit het etentje.
                </p>
              )}
              {formDirection === "Outbound" && (
                <p className="mt-1.5 text-xs text-ink-3">Alvast ingevuld met de locatie van dit event.</p>
              )}
            </div>
            {formDirection === "Restaurant" ? (
              <div>
                <label className={SL}>Bestemming</label>
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
            ) : (
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
                {formDirection === "Inbound" && (
                  <p className="mt-1.5 text-xs text-ink-3">Alvast ingevuld met de locatie van dit event.</p>
                )}
              </div>
            )}
          </div>

          {/* Restaurant opties */}
          {formDirection === "Restaurant" && (
            <div className="space-y-3 rounded-xl border-1.5 border-amber-200 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
              <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-amber-800 dark:text-amber-300">Restaurant opties</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="cb" {...register("action_required")} />
                <div>
                  <span className="text-sm font-semibold text-ink">Actie vereist</span>
                  <p className="mt-0.5 text-xs text-ink-3">Reageer verplicht voor deelname</p>
                </div>
              </label>
            </div>
          )}

          {/* Parkeerinfo */}
          {formDirection !== "Restaurant" && (
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
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            {trip.days.length > 1 ? (
              <DayChips days={trip.days} value={dayId} onChange={setDayId} allowAll />
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setShowTimeline((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-brand-text hover:underline"
            >
              <CalendarClock size={14} />
              {showTimeline ? "Verberg tijdlijn" : "Tijdlijn"}
            </button>
          </div>

          {missingPeople.length > 0 && <TripMissingList title="Nog geen vervoer" people={missingPeople} />}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={showTimeline ? "timeline" : (dayId ?? "all")}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
          {showTimeline ? (
            <RideTimeline rides={rides} />
          ) : isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <RideCardSkeleton key={i} />)}
            </div>
          ) : dayId ? (
            // One day picked via the day chips — flat groups, nothing to expand.
            renderDayContent(rides, dayId, dayId)
          ) : (
            // "Alle dagen" — one collapsible section per trip day.
            <div className="space-y-2.5">
              {trip.days.map(({ ev }) => {
                const dayRides = tripRides(allRides ?? [], meals, trip, ev.id);
                const isOpen = openDayIds.has(ev.id);
                const activeCount = dayRides.filter((r) => getRideStatus(r.departure_time).status !== "past").length;
                return (
                  <div key={ev.id} className="overflow-hidden rounded-xl border-1.5 border-line bg-surface">
                    <button
                      type="button"
                      onClick={() => toggleDay(ev.id)}
                      aria-expanded={isOpen}
                      className="flex min-h-[44px] w-full items-center gap-2.5 px-4 py-3 text-left"
                    >
                      {dayNeedsAttention(ev.id) && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                        <span className="truncate font-display text-[15px] font-extrabold uppercase tracking-[0.02em] text-ink">
                          {ev.event_name}
                        </span>
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-3">
                          {parseEventDate(ev.date)?.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) ?? ev.date}
                        </span>
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-ink-3">
                        {activeCount} {activeCount === 1 ? "rit" : "ritten"}
                      </span>
                      <ChevronDown size={14} className={`shrink-0 text-ink-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t-1.5 border-line px-4 py-4">
                            {renderDayContent(dayRides, ev.id, ev.id)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </TripSheet>
  );
}
