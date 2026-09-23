import { Fragment, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useHotelRooms } from "../../hooks/useCalendar";
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
import { TripRsvpModal } from "../../components/calendar/TripRsvpModal";
import { StoryViewer } from "../../components/story/StoryViewer";
import {
  CosplayTile, ExpensesTile, FoodTile, PhotosTile, PracticalSheet, PracticalTile, RoomsTile, TransportTile, WeatherSheet, WeatherTile,
  hasPracticalInfo,
} from "../../components/trip/TripTiles";
import { tripInfo, tripOutliers, tripPhase, tripUploadDay, type TripDay, type TripPhase } from "../../utils/trips";
import { useTrip } from "./tripContext";
import { TripTransportSheet } from "./TripTransportTab";
import { TripCosplaySheet } from "./TripCosplayTab";
import { TripRoomsSheet } from "./TripRoomsTab";

type TileId = "transport" | "food" | "rooms" | "cosplay" | "weather" | "photos" | "practical" | "expenses";

/** Always the same first four (rooms only when the trip has a hotel); the phase only orders what comes after. */
const CORE_TILES: TileId[] = ["transport", "rooms", "photos", "food"];
const TILE_ORDER: Record<TripPhase, TileId[]> = {
  upcoming: [...CORE_TILES, "cosplay", "weather", "practical", "expenses"],
  live: [...CORE_TILES, "practical", "weather", "cosplay", "expenses"],
  past: [...CORE_TILES, "expenses", "cosplay"],
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
  const [viewDayId, setViewDayId] = useState<string | null>(null);

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
  };

  return (
    <div className="space-y-4">
      <HeaderAction>
        <ShareButton onClick={onShare} />
      </HeaderAction>
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

      <StoryViewer eventDayId={viewDayId ?? ""} open={viewDayId !== null} onClose={() => setViewDayId(null)} />
    </div>
  );
}

