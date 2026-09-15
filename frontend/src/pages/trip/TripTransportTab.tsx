import { Fragment, useState, useEffect, useRef } from "react";
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
  X as XIcon,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { LocationSearchInput } from "../../components/common/LocationSearchInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/common/Button";
import { Drawer } from "../../components/common/Drawer";
import { EventPicker } from "../../components/common/EventPicker";
import { RideCardSkeleton } from "../../components/common/Skeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { StickyActionBar } from "../../components/common/StickyActionBar";
import { NamePicker } from "../../components/common/NamePicker";
import { RideCard } from "../../components/transport/RideCard";
import { RestaurantCard } from "../../components/transport/RestaurantCard";
import { RideTimeline } from "../../components/transport/RideTimeline";
import { MealPicker } from "../../components/common/MealPicker";
import { useRides, useCreateRide } from "../../hooks/useRides";
import { useUsers, useCurrentUser } from "../../hooks/useUsers";
import { useCalendar } from "../../hooks/useCalendar";
import { useMeals } from "../../hooks/useMeals";
import { toast } from "../../store/toast.store";
import { getRideStatus, groupRidesByDay } from "../../utils/rides";
import { toDateKey, todayKey, parseEventDate } from "../../utils/date";
import { useTimeStore } from "../../store/time.store";
import { isTripOver, tripGaps, tripRides } from "../../utils/trips";
import { TripMissingList } from "../../components/trip/TripMissingList";
import { useTrip } from "./tripContext";
import type { Direction } from "../../types";

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
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const TAB_ORDER: Direction[] = ["Inbound", "Outbound", "Restaurant"];

const DIRECTION_LABEL: Record<Direction, string> = {
  Inbound: "Heen",
  Outbound: "Terug",
  Restaurant: "Restaurant",
};

const WIDE_QUERY = "(min-width: 1280px)";

/** True from Tailwind's `xl` breakpoint, where the three lanes fit side by side. */
function useIsWide() {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return wide;
}

/** Event › Vervoer: this trip's Heen / Terug / Restaurant rides, plus who has none yet. */
export function TripTransportTab() {
  const { trip, dayId } = useTrip();
  const location = useLocation();
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const [tab, setTab] = useState<Direction>(
    (location.state as { tab?: Direction })?.tab ?? "Inbound",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isWide = useIsWide();
  const { data: allRides, isLoading } = useRides();
  const { data: users } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const { data: events = [] } = useCalendar();
  const { data: meals = [] } = useMeals();
  const userNames = (users ?? []).map((u) => u.name);
  const createMutation = useCreateRide();

  const rides = tripRides(allRides ?? [], meals, trip, dayId);
  const gaps = tripGaps(trip, allRides ?? [], meals);
  const tripMealIds = new Set(meals.filter((m) => m.linked_event_id && trip.eventIds.includes(m.linked_event_id)).map((m) => m.id));
  const tripMealOptions = meals.filter((m) => tripMealIds.has(m.id));

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
  const upcomingEvents = upcomingTripDays.length > 0 ? upcomingTripDays : events.filter((e) => isUpcoming(e.date));

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

  // Rides per direction, split into still-to-come and already departed.
  function laneRides(d: Direction) {
    const all = rides.filter((r) => r.direction === d);
    const active = all.filter(
      (r) => getRideStatus(r.departure_time).status !== "past",
    );
    const past = all
      .filter((r) => getRideStatus(r.departure_time).status === "past")
      .sort(
        (a, b) =>
          new Date(b.departure_time.replace(" ", "T")).getTime() -
          new Date(a.departure_time.replace(" ", "T")).getTime(),
      );
    return { all, active, past };
  }

  function openCreate(direction: Direction = tab) {
    const defaultDay = upcomingTripDays.find((d) => d.id === dayId) ?? upcomingTripDays[0];
    reset({
      direction,
      total_seats: 5,
      driver: currentUser?.name ?? "",
      linked_event_id: direction === "Restaurant" ? undefined : defaultDay?.id,
      start_location: direction === "Outbound" ? defaultDay?.location ?? "" : "",
      end_location: direction === "Inbound" ? defaultDay?.location ?? "" : "",
      parking_info: defaultDay?.parking_info ?? "",
    });
    setCreateOpen(true);
  }

  function handleClose() {
    setCreateOpen(false);
    reset();
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
      handleClose();
      toast("success", "Rit toegevoegd aan het schema!");
    } catch {
      toast("error", "Kon de rit niet toevoegen. Probeer opnieuw.");
    }
  }

  function renderLane(d: Direction, withHead: boolean) {
    const { all, active, past } = laneRides(d);
    const addLabel = d === "Restaurant" ? "Route toevoegen" : "Rit toevoegen";

    return (
      <section className="flex min-w-0 flex-col gap-3" aria-label={withHead ? DIRECTION_LABEL[d] : undefined}>
        {withHead && (
          <div className="flex items-center gap-2 border-b-2 border-outline px-0.5 pb-1">
            <h3 className="font-display text-[22px] font-extrabold uppercase leading-none tracking-[0.02em] text-ink">
              {DIRECTION_LABEL[d]}
            </h3>
            <span className="font-mono text-[12px] tabular-nums text-ink-3">{active.length}</span>
            <button
              type="button"
              onClick={() => openCreate(d)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
              title={addLabel}
              aria-label={addLabel}
            >
              <Plus size={15} />
            </button>
          </div>
        )}

        {d !== "Restaurant" && !isTripOver(trip) && (
          <TripMissingList
            title="Nog geen vervoer"
            people={gaps.transport
              .filter((g) => g.items.includes(d === "Inbound" ? "Heen" : "Terug"))
              .map((g) => ({ name: g.name, detail: g.items.join(" & ") }))}
          />
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <RideCardSkeleton key={i} />)}
          </div>
        ) : all.length === 0 ? (
          <EmptyState
            icon={<Car size={22} />}
            title="Geen ritten gepland"
            description={`Er zijn nog geen ${d === "Inbound" ? "heenritten" : d === "Outbound" ? "terugritten" : "restaurantritten"} toegevoegd.`}
          />
        ) : (
          <>
            {active.length === 0 ? (
              <EmptyState
                icon={<Car size={22} />}
                title="Geen actieve ritten"
                description="Alle ritten zijn al vertrokken. Bekijk de geschiedenis hieronder."
              />
            ) : (
              <motion.div
                key={d}
                className="space-y-5"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {groupRidesByDay(active).map((group) => (
                  <div key={group.label}>
                    <p className="section-label mb-2">
                      {group.label}
                    </p>
                    <div className="space-y-3">
                      {group.rides.map((ride) =>
                        ride.direction === "Restaurant" ? (
                          <RestaurantCard key={ride.id} ride={ride} userNames={userNames} />
                        ) : (
                          <RideCard key={ride.id} ride={ride} userNames={userNames} />
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {past.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  aria-expanded={showHistory}
                  className="card-surface-hover flex min-h-[44px] w-full items-center justify-between px-4 py-2.5 text-[13px] font-semibold text-ink-2 hover:text-ink"
                >
                  <span className="flex items-center gap-2">
                    <History size={14} />
                    Geschiedenis <span className="font-mono tabular-nums">({past.length})</span>
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`} />
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
                        {past.map((ride) =>
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
        )}
      </section>
    );
  }

  const footer = (
    <Button
      type="submit"
      form="create-ride-form"
      loading={isSubmitting}
      className="w-full"
    >
      {formDirection === "Restaurant" ? "Route opslaan" : "Rit opslaan"}
    </Button>
  );

  return (
    <div
      className="min-h-[65vh] space-y-5 pb-44 xl:pb-10"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;
        if (showTimeline || isWide) return;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const currentIndex = TAB_ORDER.indexOf(tab);
        if (dx < 0 && currentIndex < TAB_ORDER.length - 1) setTab(TAB_ORDER[currentIndex + 1]);
        if (dx > 0 && currentIndex > 0) setTab(TAB_ORDER[currentIndex - 1]);
      }}
    >
      {/* Desktop toolbar: lanes sit side by side, so only the timeline toggle is needed */}
      {isWide && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowTimeline((v) => !v)}
            aria-pressed={showTimeline}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${showTimeline
              ? "bg-ink text-paper dark:bg-brand dark:text-brand-on"
              : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
              }`}
            title="Tijdlijn"
          >
            <CalendarClock size={15} />
            Tijdlijn
          </button>
        </div>
      )}

      {/* Timeline view */}
      {showTimeline && (
        <div className="mx-auto w-full max-w-3xl">
          <RideTimeline rides={rides} />
        </div>
      )}

      {/* Lanes: one at a time on phones and tablets, side by side from xl */}
      {!showTimeline && (
        isWide ? (
          <div className="grid grid-cols-3 items-start gap-6">
            {TAB_ORDER.map((d) => (
              <Fragment key={d}>{renderLane(d, true)}</Fragment>
            ))}
          </div>
        ) : (
          renderLane(tab, false)
        )
      )}

      {/* Direction tabs + timeline toggle + add button */}
      {!isWide && (
        <StickyActionBar>
          <div className="space-y-2 rounded-2xl border-1.5 border-line bg-surface p-2 shadow-lg">
            <div className="flex gap-2">
              <div className="flex flex-1 gap-1 rounded-[10px] border-1.5 border-line bg-sunken p-[3px]">
                {TAB_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setTab(d); setShowTimeline(false); }}
                    aria-pressed={tab === d && !showTimeline}
                    className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-2 py-2 text-[13px] font-semibold transition-colors ${tab === d && !showTimeline
                      ? "bg-surface text-ink shadow-[0_0_0_1.5px_rgb(var(--outline))]"
                      : "text-ink-2 hover:text-ink"
                      }`}
                  >
                    {d === "Inbound" && <ArrowRight size={13} className="shrink-0" />}
                    {d === "Outbound" && <ArrowLeft size={13} className="shrink-0" />}
                    {d === "Restaurant" && <Utensils size={13} className="shrink-0" />}
                    {DIRECTION_LABEL[d]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowTimeline((v) => !v)}
                aria-pressed={showTimeline}
                aria-label="Tijdlijn"
                className={`flex w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors ${showTimeline
                  ? "bg-ink text-paper dark:bg-brand dark:text-brand-on"
                  : "border-1.5 border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
                  }`}
                title="Tijdlijn"
              >
                <CalendarClock size={16} />
              </button>
            </div>
            <Button className="w-full" onClick={() => openCreate()}>
              <Plus size={16} />
              {tab === "Restaurant" ? "Route toevoegen" : "Rit toevoegen"}
            </Button>
          </div>
        </StickyActionBar>
      )}

      {/* Create drawer */}
      <Drawer
        open={createOpen}
        onClose={handleClose}
        title={formDirection === "Restaurant" ? "Route toevoegen" : "Rit toevoegen"}
        subtitle={
          formDirection === "Restaurant"
            ? "Zet tijd en locatie neer — pas als iemand “Ik rijd” aangeeft, is er echt een rit"
            : "Vul de details van de rit in"
        }
        footer={footer}
      >
        <form id="create-ride-form" onSubmit={handleSubmit(onCreate)} className="space-y-5">

          {/* Richting */}
          <div className={SF}>
            <p className={ST}>Richting</p>
            <select className="input-field dark:[color-scheme:dark]" {...register("direction")}>
              <option value="Inbound">Heen</option>
              <option value="Outbound">Terug</option>
              <option value="Restaurant">Restaurant</option>
            </select>
          </div>

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

          {/* Event / etentje koppeling — de datum (en voor Heen/Terug ook de locatie) volgt hieruit */}
          {formDirection === "Restaurant" ? (
            (tripMealOptions.length > 0 || meals.length > 0) && (
              <div className={SF}>
                <p className={ST}>Koppel aan etentje</p>
                <Controller
                  name="linked_meal_id"
                  control={control}
                  render={({ field }) => (
                    <MealPicker
                      meals={tripMealOptions.length > 0 ? tripMealOptions : meals}
                      value={field.value || undefined}
                      onChange={(id) => field.onChange(id ?? "")}
                    />
                  )}
                />
              </div>
            )
          ) : (
            <div className={SF}>
              <p className={ST}>Event</p>
              <Controller
                name="linked_event_id"
                control={control}
                render={({ field }) => (
                  <EventPicker
                    events={upcomingEvents}
                    value={field.value || undefined}
                    onChange={(id) => {
                      field.onChange(id ?? "");
                      if (id) {
                        const event = events.find((e) => e.id === id);
                        const locationField = formDirection === "Outbound" ? "start_location" : "end_location";
                        if (event?.location) setValue(locationField, event.location, { shouldValidate: true });
                        if (event?.parking_info) setValue("parking_info", event.parking_info, { shouldValidate: true });
                      }
                    }}
                    placeholder="Zoek en koppel een event…"
                  />
                )}
              />
              <p className="mt-1.5 text-xs text-ink-3">
                De datum en {formDirection === "Outbound" ? "het vertrekpunt" : "de bestemming"} volgen uit het event.
              </p>
              {errors.linked_event_id && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.linked_event_id.message}</p>
              )}
            </div>
          )}

          {/* Vertrektijd & zitplaatsen */}
          <div className={SF}>
            <p className={ST}>Timing</p>
            <div className={`grid gap-3 ${formDirection === "Restaurant" ? "grid-cols-1" : "grid-cols-2"}`}>
              <div>
                <label className={SL}>{formDirection === "Restaurant" ? "Vertrektijd" : "Tijd"}</label>
                <input
                  type={formDirection === "Restaurant" ? "datetime-local" : "time"}
                  className="input-field"
                  {...register(formDirection === "Restaurant" ? "departure_time" : "ride_time")}
                />
                {(errors.departure_time || errors.ride_time) && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                    {(errors.departure_time ?? errors.ride_time)?.message}
                  </p>
                )}
              </div>
              {formDirection !== "Restaurant" && (
                <div>
                  <label className={SL}>Plekken in de auto</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="input-field"
                    {...register("total_seats")}
                  />
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
                  Waar vertrekt deze rit vandaan? De bestemming (het restaurant) komt automatisch uit het gekoppelde etentje hierboven.
                </p>
              )}
              {formDirection === "Outbound" && (
                <p className="mt-1.5 text-xs text-ink-3">Komt automatisch uit het gekoppelde event.</p>
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
                {formDirection === "Inbound" && (
                  <p className="mt-1.5 text-xs text-ink-3">Komt automatisch uit het gekoppelde event.</p>
                )}
              </div>
            )}
          </div>

          {/* Restaurant opties */}
          {formDirection === "Restaurant" && (
            <div className="space-y-3 rounded-xl border-1.5 border-amber-200 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
              <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-amber-800 dark:text-amber-300">Restaurant opties</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="cb"
                  {...register("action_required")}
                />
                <div>
                  <span className="text-sm font-semibold text-ink">
                    Actie vereist
                  </span>
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
      </Drawer>
    </div>
  );
}
