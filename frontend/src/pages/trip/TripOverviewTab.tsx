import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useCalendar, useHotelRooms } from "../../hooks/useCalendar";
import { useSwipe } from "../../hooks/useSwipe";
import { useUsers } from "../../hooks/useUsers";
import { useMeals } from "../../hooks/useMeals";
import { useRides } from "../../hooks/useRides";
import { useCosplays } from "../../hooks/useCosplays";
import { useExpenses } from "../../hooks/useExpenses";
import { useStorySummary } from "../../hooks/useStories";
import { useTripRsvp } from "../../hooks/useTripRsvp";
import { useTimeStore } from "../../store/time.store";
import { toast } from "../../store/toast.store";
import { routes } from "../../config/routes";
import { TripTicket } from "../../components/trip/TripTicket";
import { HeaderAction } from "../../components/layout/HeaderAction";
import { ShareButton } from "../../components/common/ShareButton";
import { TripEditButton } from "../../components/trip/TripEditButton";
import { TripSwitcher, TripSwitcherButton } from "../../components/trip/TripSwitcher";
import { SwipeHint } from "../../components/trip/SwipeHint";
import { TripRsvpModal } from "../../components/calendar/TripRsvpModal";
import { StoryViewer } from "../../components/story/StoryViewer";
import {
  CosplayTile, ExpensesTile, FoodTile, PhotosTile, PracticalSheet, PracticalTile, RoomsTile, TicketSheet, TicketTile, TransportTile, WeatherSheet, WeatherTile,
  hasPracticalInfo,
} from "../../components/trip/TripTiles";
import { buildTrips, tripInfo, tripOutliers, tripPhase, tripUploadDay, type TripDay, type TripPhase } from "../../utils/trips";
import { useTrip } from "./tripContext";
import { TripTransportSheet } from "./TripTransportTab";
import { TripCosplaySheet } from "./TripCosplayTab";
import { TripRoomsSheet } from "./TripRoomsTab";

type TileId = "transport" | "food" | "rooms" | "cosplay" | "weather" | "photos" | "practical" | "expenses" | "tickets";

/** Always the same first four (rooms only when the trip has a hotel); the phase only orders what comes after. */
const CORE_TILES: TileId[] = ["transport", "rooms", "photos", "food"];
const TILE_ORDER: Record<TripPhase, TileId[]> = {
  upcoming: [...CORE_TILES, "tickets", "cosplay", "weather", "practical", "expenses"],
  live: [...CORE_TILES, "tickets", "practical", "weather", "cosplay", "expenses"],
  past: [...CORE_TILES, "expenses", "cosplay"],
};

// A short slide + fade when swiping (or paging via the switcher's arrows)
// between trips — enough to read as "this moved that way", not a showy
// page transition. `custom` carries the direction into the variant
// functions, same pattern TripSheet.tsx uses for its own view transitions.
const tripSlideVariants = {
  enter: (dir: "left" | "right") => ({ opacity: 0, x: dir === "left" ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: "left" | "right") => ({ opacity: 0, x: dir === "left" ? -28 : 28 }),
};

/**
 * Event › Overzicht: the trip's ticket with a tile per part of the trip.
 * Tiles summarise and link to their own page, where things get changed;
 * only read-only info (weather, practical) unfolds in place.
 */
export function TripOverviewTab() {
  const { trip, activeTab, dayId } = useTrip();
  const navigate = useNavigate();
  useTimeStore((s) => s.override); // re-render when the time-travel override changes
  const { data: users = [] } = useUsers();
  const { data: meals = [] } = useMeals();
  const { data: rides = [] } = useRides();
  const { data: cosplays = [] } = useCosplays();
  const { data: expenses = [] } = useExpenses();
  const { data: storySummary } = useStorySummary(trip.eventIds);
  const hotelDay = trip.days.find((d) => d.ev.is_hotel)?.ev;
  const { data: rooms = [] } = useHotelRooms(hotelDay?.id ?? "", { enabled: !!hotelDay });
  const { myNames, joinTrip, leaveTrip, toggleDay, manageRsvp } = useTripRsvp();

  const [justJoined, setJustJoined] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [practicalOpen, setPracticalOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  // A Hub shortcut can link straight here with ?openTicket=1 (the sheet itself
  // isn't part of the ?sheet= routing, since it's purely local/per-device —
  // this is a one-shot flag, not a real deep link anyone else could open).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (!searchParams.get("openTicket")) return;
    setTicketOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("openTicket");
    setSearchParams(next, { replace: true });
    // Runs once, right after mount — not on every searchParams change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [viewDayId, setViewDayId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Swipe sideways to the next or previous trip (chronological, like the switcher's list).
  const pageRef = useRef<HTMLDivElement>(null);
  const { data: calendar = [] } = useCalendar();
  const allTrips = buildTrips(calendar);
  const at = allTrips.findIndex((t) => t.id === trip.id);
  // Bumped on every trip switch (swipe or otherwise) — the swipe hint below
  // watches this to cut itself short the moment its lesson is no longer needed.
  const [tripSwitchCount, setTripSwitchCount] = useState(0);
  // Which way the content should slide: left when moving to a later trip
  // (swiping left, or the next-arrow), right for an earlier one — the same
  // direction a finger dragged, so the page follows it instead of fighting it.
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right">("left");
  const goToTrip = (index: number) => {
    const target = allTrips[index];
    if (!target) return;
    setSwipeDirection(index > at ? "left" : "right");
    setTripSwitchCount((c) => c + 1);
    navigate(routes.trip.view(target.id));
    window.scrollTo(0, 0);
  };
  useSwipe(pageRef, {
    enabled: at >= 0 && activeTab === "overview",
    onLeft: () => goToTrip(at + 1),
    onRight: () => goToTrip(at - 1),
  });

  /** Closes whichever sheet the URL currently has open, back to plain Overzicht. */
  const closeSheet = () => navigate(routes.trip.view(trip.id, "overview", dayId ?? undefined), { replace: true });

  const phase = tripPhase(trip);
  const info = tripInfo(trip);
  const uploadDay = tripUploadDay(trip);

  async function onToggleDay(day: TripDay) {
    const joined = await toggleDay(day);
    if (joined) setJustJoined(true);
  }

  async function onShare() {
    const url = `${window.location.origin}${routes.trip.view(trip.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.title, url });
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("success", "Link gekopieerd!");
    } catch {
      toast("error", "Kon de link niet kopiëren.");
    }
  }

  const tiles: Record<TileId, ReactNode> = {
    transport: <TransportTile trip={trip} phase={phase} rides={rides} meals={meals} myNames={myNames} />,
    food: <FoodTile trip={trip} phase={phase} meals={meals} myNames={myNames} />,
    rooms: trip.isHotel && <RoomsTile trip={trip} phase={phase} rooms={rooms} users={users} myNames={myNames} />,
    cosplay: trip.hasCon && <CosplayTile trip={trip} cosplays={cosplays} myNames={myNames} />,
    weather: trip.location && phase !== "past" && <WeatherTile trip={trip} onOpen={() => setWeatherOpen(true)} />,
    photos: <PhotosTile trip={trip} phase={phase} summary={storySummary} onOpenDay={setViewDayId} uploadDayId={uploadDay?.ev.id} />,
    practical: phase !== "past" && (hasPracticalInfo(info) || tripOutliers(trip).length > 0) && (
      <PracticalTile info={info} trip={trip} onOpen={() => setPracticalOpen(true)} />
    ),
    expenses: <ExpensesTile trip={trip} phase={phase} expenses={expenses} myNames={myNames} />,
    tickets: phase !== "past" && <TicketTile trip={trip} onOpen={() => setTicketOpen(true)} />,
  };

  return (
    <div ref={pageRef} className="space-y-4">
      <SwipeHint enabled={at >= 0 && activeTab === "overview" && allTrips.length > 1} dismissedBy={tripSwitchCount} />
      <HeaderAction>
        <TripSwitcherButton iconOnly onClick={() => setSwitcherOpen(true)} />
        <TripEditButton trip={trip} />
        <ShareButton onClick={onShare} />
      </HeaderAction>
      <AnimatePresence mode="popLayout" initial={false} custom={swipeDirection}>
        <motion.div
          key={trip.id}
          custom={swipeDirection}
          variants={tripSlideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-4"
        >
          <TripTicket
            trip={trip}
            phase={phase}
            users={users}
            myNames={myNames}
            description={info.description}
            hotel={info.hotel_location}
            justJoined={justJoined}
            onToggleDay={onToggleDay}
            onJoin={() => {
              setJustJoined(true);
              joinTrip(trip);
            }}
            onLeave={() => {
              setJustJoined(false);
              leaveTrip(trip);
            }}
            onManage={() => setManageOpen(true)}
          />

          {/* Dense flow fills the gaps a missing tile (no hotel, no con) would leave. */}
          <div className="grid grid-flow-dense grid-cols-2 gap-3 lg:grid-cols-4">
            {TILE_ORDER[phase].map((id) => tiles[id] && <Fragment key={id}>{tiles[id]}</Fragment>)}
          </div>
        </motion.div>
      </AnimatePresence>

      <TripSwitcherButton onClick={() => setSwitcherOpen(true)} />
      <TripSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} currentId={trip.id} myNames={myNames} />

      <TripRsvpModal
        trip={manageOpen ? trip : null}
        users={users}
        onClose={() => setManageOpen(false)}
        onConfirm={manageRsvp}
      />

      {/* Every other part of the trip opens as a sheet over this page instead of its own route. */}
      <TripTransportSheet open={activeTab === "transport"} onClose={closeSheet} />
      {trip.hasCon && <TripCosplaySheet open={activeTab === "cosplay"} onClose={closeSheet} />}
      {trip.isHotel && <TripRoomsSheet open={activeTab === "rooms"} onClose={closeSheet} />}
      {trip.location && <WeatherSheet open={weatherOpen} onClose={() => setWeatherOpen(false)} trip={trip} />}
      <PracticalSheet open={practicalOpen} onClose={() => setPracticalOpen(false)} info={info} trip={trip} />
      <TicketSheet open={ticketOpen} onClose={() => setTicketOpen(false)} trip={trip} />

      <StoryViewer eventDayId={viewDayId ?? ""} open={viewDayId !== null} onClose={() => setViewDayId(null)} />
    </div>
  );
}

