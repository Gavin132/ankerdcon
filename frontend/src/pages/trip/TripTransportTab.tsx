import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, ChevronDown, History, X as XIcon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { LocationSearchInput } from "../../components/common/LocationSearchInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/common/Button";
import { TripSheet } from "../../components/trip/TripSheet";
import { DayChips } from "../../components/trip/DayChips";
import { NamePicker } from "../../components/common/NamePicker";
import { RideRow } from "../../components/transport/RideRow";
import { RestaurantMealPrompt, RestaurantRideGroup } from "../../components/transport/RestaurantRideGroup";
import { useRides, useCreateRide } from "../../hooks/useRides";
import { useUsers, useCurrentUser } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { useMeals } from "../../hooks/useMeals";
import { toast } from "../../store/toast.store";
import { getRideStatus } from "../../utils/rides";
import { planDirection } from "../../utils/carBalance";
import { toDateKey, todayKey, parseEventDate, splitDateTime } from "../../utils/date";
import { useTimeStore } from "../../store/time.store";
import { isTripOver, tripGaps, tripRides } from "../../utils/trips";
import { defaultTransportView, driversMissing } from "../../utils/transportView";
import { defaultRideEnds } from "../../utils/rideLocations";
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

const SECTION_LABEL: Record<Direction, string> = {
  Inbound: "Heen",
  Outbound: "Terug",
  Restaurant: "Activiteiten",
};

const departureTime = (r: Ride) => new Date(r.departure_time.replace(" ", "T")).getTime();

/**
 * Event › Vervoer, opened as a bottom sheet over Overzicht. One day at a time
 * (day chips on a multi-day trip), with Heen, Terug and Eten as three sections
 * under each other. It opens on the day, and scrolls to the section, that the Hub's
 * "Rit aanbieden" and "Meerijden" tiles would open on (see `defaultTransportView`)
 * and then stays where the member puts it. Your own ride is the blue row. Adding a ride slides
 * the sheet to its own form view instead of stacking a second overlay on top.
 */
export function TripTransportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { trip } = useTrip();
  const location = useLocation();
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const [view, setView] = useState<"list" | "form">("list");
  // The sheet stays mounted when closed, so without this it reopened on the
  // create form. Waits for the slide-out to finish so the content does not
  // swap while it is still on screen.
  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => setView("list"), 400);
    return () => window.clearTimeout(t);
  }, [open]);
  // Heen, Terug and Eten sit under each other; this is how the sheet scrolls to one of
  // them when it opens on something other than Heen (see `defaultTransportView`).
  const sectionRefs = useRef<Partial<Record<Direction, HTMLElement | null>>>({});
  function scrollToSection(direction: Direction, delayMs: number) {
    if (direction === "Inbound") return;
    window.setTimeout(() => sectionRefs.current[direction]?.scrollIntoView({ block: "start", behavior: "smooth" }), delayMs);
  }
  const [activeDayId, setActiveDayId] = useState(() => trip.days[0].ev.id);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<Direction[]>([]);
  const { data: allRides, isLoading } = useRides();
  const { data: users } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const { data: events = [] } = useCalendar();
  const { data: meals = [] } = useMeals();
  const userNames = (users ?? []).map((u) => u.name);
  /** One form of a name, so someone on a ride under a former name isn't counted twice. */
  const canonicalName = (name: string) =>
    ((users ?? []).find((u) => u.name === name || u.discord_username === name || u.aliases?.includes(name))?.name ?? name).toLowerCase();
  const createMutation = useCreateRide();

  // Each time the sheet opens, it picks the direction and day that are next up.
  useEffect(() => {
    if (!open) return;
    const start = defaultTransportView(trip, meals);
    setActiveDayId(start.dayId);
    setExpandedRideId(null);
    setHistoryOpen([]);
    // Waits out the sheet's slide-in, so the scroll isn't swallowed by it.
    scrollToSection(start.direction, 450);
    // Deliberately only on open: later changes to the meals must not undo a choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dayRides = tripRides(allRides ?? [], meals, trip, activeDayId);
  const tripAllRides = tripRides(allRides ?? [], meals, trip);
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

  // ── What the list shows: the three sections of one day ───────────────────
  const myCanon = currentUser ? canonicalName(currentUser.name) : null;
  const isMine = (r: Ride) =>
    !!myCanon && (canonicalName(r.driver) === myCanon || r.passengers.some((p) => canonicalName(p) === myCanon));
  const isActive = (r: Ride) => getRideStatus(r.departure_time).status !== "past";

  // Restaurant rides are created from the meal ("Ik rijd" on a meal that has no ride yet).
  const mealsWithoutRide = tripMealOptions.filter(
    (m) =>
      m.transport_needed &&
      m.linked_event_id === activeDayId &&
      !(allRides ?? []).some((r) => r.direction === "Restaurant" && r.linked_meal_id === m.id),
  );
  // No Eten without a meal on the trip (unless something already points there).
  const showEten = tripMealOptions.length > 0 || dayRides.some((r) => r.direction === "Restaurant");

  /** Everything one section (Heen, Terug or Eten) of the active day shows. */
  function sectionOf(direction: Direction) {
    const all = dayRides.filter((r) => r.direction === direction);
    const active = all.filter(isActive).sort((a, b) => departureTime(a) - departureTime(b));
    const past = all.filter((r) => !isActive(r)).sort((a, b) => departureTime(a) - departureTime(b));
    // Someone can only be the driver of one ride per direction per day, so once
    // they have one, offering another would just invite a duplicate: the button
    // goes, and the ride itself offers to be taken back.
    const myDriverRide = direction !== "Restaurant" ? active.find((r) => r.driver === currentUser?.name) : undefined;
    const canOffer = direction !== "Restaurant" && !isTripOver(trip) && !myDriverRide;
    // How full each car should leave so nobody is left behind (Heen and Terug, per day).
    const plan =
      direction !== "Restaurant" && !isTripOver(trip)
        ? planDirection(all, trip.days.find((d) => d.ev.id === activeDayId)?.ev.participants ?? [], canonicalName)
        : null;
    // Drivers who planned the other way for this trip but not this one: on the way back,
    // that is the list of who still has to make a Terug ride, without going through everyone.
    const missingDrivers =
      direction === "Restaurant" || isTripOver(trip)
        ? []
        : driversMissing(tripAllRides, direction === "Inbound" ? "Outbound" : "Inbound", direction, canonicalName);
    return { all, active, past, canOffer, plan, missingDrivers };
  }

  function pickDay(id: string) {
    setActiveDayId(id);
    setExpandedRideId(null);
    setHistoryOpen([]);
  }

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
    if (state?.tab) {
      openCreate(state.tab, defaultTransportView(trip, meals).dayId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openCreate(direction: Direction = "Inbound", explicitDayId?: string) {
    const defaultDay = upcomingTripDays.find((d) => d.id === (explicitDayId ?? activeDayId)) ?? upcomingTripDays[0];
    // The meal a new restaurant ride links to by default — whichever of this
    // day's etentjes comes first; falls back to the trip's next one if this
    // day doesn't have one of its own yet.
    const dayMeals = tripMealOptions
      .filter((m) => m.linked_event_id === defaultDay?.id)
      .sort((a, b) => a.time.localeCompare(b.time));
    const defaultMeal = dayMeals[0] ?? tripMealOptions[0];
    // The hotel is the other end of a ride on the days the member sleeps there.
    const ends = defaultRideEnds({
      direction,
      dayIndex: trip.days.findIndex((d) => d.ev.id === defaultDay?.id),
      dayCount: trip.days.length,
      venue: defaultDay?.location ?? "",
      hotel: trip.days.find((d) => d.ev.hotel_location)?.ev.hotel_location ?? "",
      isHotel: trip.isHotel,
    });
    reset({
      direction,
      total_seats: 5,
      driver: currentUser?.name ?? "",
      linked_event_id: direction === "Restaurant" ? undefined : defaultDay?.id,
      linked_meal_id: direction === "Restaurant" ? defaultMeal?.id : undefined,
      start_location: ends.start,
      end_location: direction === "Restaurant" ? defaultMeal?.location ?? "" : ends.end,
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
      // Back on the list, looking at the ride that was just added.
      if (values.linked_event_id) setActiveDayId(values.linked_event_id);
      setExpandedRideId(null);
      reset();
      setView("list");
      scrollToSection(values.direction as Direction, 250);
      toast("success", "Rit toegevoegd aan het schema!");
    } catch {
      toast("error", "Kon de rit niet toevoegen. Probeer opnieuw.");
    }
  }

  function renderRow(ride: Ride, plan: ReturnType<typeof sectionOf>["plan"], readOnly = false) {
    return (
      <RideRow
        key={ride.id}
        ride={ride}
        userNames={userNames}
        guidance={readOnly ? undefined : plan?.cars.find((c) => c.rideId === ride.id)}
        mine={isMine(ride)}
        expanded={expandedRideId === ride.id}
        onToggle={() => setExpandedRideId((prev) => (prev === ride.id ? null : ride.id))}
        canDelete={!readOnly && !isTripOver(trip)}
      />
    );
  }

  function renderSection(direction: Direction) {
    const { active, past, canOffer, plan, missingDrivers } = sectionOf(direction);
    const isEten = direction === "Restaurant";
    const count = active.length + (isEten ? mealsWithoutRide.length : 0);
    const historyShown = historyOpen.includes(direction);
    return (
      <section key={direction} ref={(el) => { sectionRefs.current[direction] = el; }} className="scroll-mt-2 space-y-2.5">
        <div className="flex items-center justify-between gap-2.5">
          <h3 className="flex items-baseline gap-2 font-display text-[22px] font-extrabold uppercase leading-none text-ink">
            {SECTION_LABEL[direction]}
            {count > 0 && <span className="font-mono text-[12px] font-semibold tabular-nums text-ink-3">{count}</span>}
          </h3>
          {canOffer && (
            <button
              type="button"
              onClick={() => openCreate(direction, activeDayId)}
              className="btn-primary h-[34px] shrink-0 px-3 text-[12.5px]"
            >
              <Car size={14} /> Rit aanbieden
            </button>
          )}
        </div>

        {missingDrivers.length > 0 && (
          <p className="text-[12.5px] leading-snug text-ink-2">
            <span className="font-semibold text-ink">{direction === "Outbound" ? "Nog geen terugrit" : "Nog geen heenrit"}:</span>{" "}
            {missingDrivers.join(", ")}
          </p>
        )}

        {isEten ? (
          active.length === 0 && mealsWithoutRide.length === 0 ? (
            <p className="py-1 text-xs text-ink-3">Nog geen activiteit met vervoer op deze dag.</p>
          ) : (
            <motion.div className="space-y-2.5" variants={container} initial="hidden" animate="show">
              {mealsWithoutRide.map((m) => <RestaurantMealPrompt key={m.id} meal={m} />)}
              {active.map((ride) => <RestaurantRideGroup key={ride.id} ride={ride} userNames={userNames} />)}
            </motion.div>
          )
        ) : active.length === 0 ? (
          <p className="py-1 text-xs text-ink-3">Nog geen rit.</p>
        ) : (
          <div className="card-surface divide-y divide-line overflow-hidden">{active.map((ride) => renderRow(ride, plan))}</div>
        )}

        {past.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => (v.includes(direction) ? v.filter((d) => d !== direction) : [...v, direction]))}
              aria-expanded={historyShown}
              className="flex min-h-[40px] items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-ink"
            >
              <History size={13} />
              Geschiedenis <span className="font-mono tabular-nums">({past.length})</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${historyShown ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {historyShown && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {isEten ? (
                    <div className="mt-2 space-y-2.5 opacity-60">
                      {past.map((ride) => <RestaurantRideGroup key={ride.id} ride={ride} userNames={userNames} />)}
                    </div>
                  ) : (
                    <div className="card-surface mt-2 divide-y divide-line overflow-hidden">{past.map((ride) => renderRow(ride, plan, true))}</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>
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
          : `${trip.title} · ${trip.dateRange}`
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
          {trip.days.length > 1 && (
            <DayChips days={trip.days} value={activeDayId} onChange={(id) => id && pickDay(id)} attention={dayNeedsAttention} />
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeDayId}
              className="space-y-6"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            >
              {isLoading ? (
                <div className="space-y-2.5">
                  {[0, 1, 2].map((i) => <div key={i} className="h-[64px] animate-pulse rounded-xl bg-sunken" />)}
                </div>
              ) : (
                <>
                  {renderSection("Inbound")}
                  {renderSection("Outbound")}
                  {showEten && renderSection("Restaurant")}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <TripMissingList
            title={`${missingPeople.length} ${missingPeople.length === 1 ? "persoon heeft" : "mensen hebben"} nog geen vervoer`}
            people={missingPeople}
          />
        </div>
      )}
    </TripSheet>
  );
}
