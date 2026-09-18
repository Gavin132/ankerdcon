import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
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
import { TripRsvpModal } from "../../components/calendar/TripRsvpModal";
import { StoryViewer } from "../../components/story/StoryViewer";
import {
  CosplayTile, ExpensesTile, FoodTile, PhotosTile, PracticalPanel, PracticalTile, RoomsTile, TransportTile, WeatherPanel, WeatherTile,
  hasPracticalInfo,
} from "../../components/trip/TripTiles";
import { tripInfo, tripPhase, tripUploadDay, type TripDay, type TripPhase } from "../../utils/trips";
import { useTrip } from "./tripContext";
import { TripTransportSheet } from "./TripTransportTab";
import { TripCosplaySheet } from "./TripCosplayTab";
import { TripRoomsSheet } from "./TripRoomsTab";

type TileId = "transport" | "food" | "rooms" | "cosplay" | "weather" | "photos" | "practical" | "expenses";

/** What matters most first: plans ahead of the trip, the day itself while it's on, photos and costs after. */
const TILE_ORDER: Record<TripPhase, TileId[]> = {
  upcoming: ["transport", "food", "rooms", "cosplay", "weather", "photos", "practical", "expenses"],
  live: ["food", "photos", "transport", "practical", "weather", "rooms", "cosplay", "expenses"],
  past: ["photos", "expenses", "transport", "food", "cosplay", "rooms"],
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
  const [openPanel, setOpenPanel] = useState<"weather" | "practical" | null>(null);
  const [viewDayId, setViewDayId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  // The panel a tile unfolds always renders at the end of the tile grid, not
  // right after the tile itself (a full-width item dropped mid-grid would
  // throw off the dense packing of the tiles around it) — scroll it into
  // view on open so "Uitklappen" doesn't look like it did nothing.
  useEffect(() => {
    if (!openPanel) return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [openPanel]);

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

  const togglePanel = (panel: "weather" | "practical") => setOpenPanel((open) => (open === panel ? null : panel));

  const tiles: Record<TileId, ReactNode> = {
    transport: <TransportTile trip={trip} phase={phase} rides={rides} meals={meals} myNames={myNames} />,
    food: <FoodTile trip={trip} phase={phase} meals={meals} myNames={myNames} />,
    rooms: trip.isHotel && <RoomsTile trip={trip} phase={phase} rooms={rooms} users={users} myNames={myNames} />,
    cosplay: trip.hasCon && <CosplayTile trip={trip} cosplays={cosplays} myNames={myNames} />,
    weather: trip.location && phase !== "past" && (
      <WeatherTile trip={trip} expanded={openPanel === "weather"} onToggle={() => togglePanel("weather")} />
    ),
    photos: <PhotosTile trip={trip} phase={phase} summary={storySummary} onOpenDay={setViewDayId} uploadDayId={uploadDay?.ev.id} />,
    practical: phase !== "past" && hasPracticalInfo(info) && (
      <PracticalTile info={info} expanded={openPanel === "practical"} onToggle={() => togglePanel("practical")} />
    ),
    expenses: <ExpensesTile trip={trip} phase={phase} expenses={expenses} myNames={myNames} />,
  };

  return (
    <div className="space-y-4">
      <TripTicket
        trip={trip}
        phase={phase}
        users={users}
        myNames={myNames}
        description={info.description}
        hotel={info.hotel_location}
        uploadDayId={uploadDay?.ev.id}
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
        onShare={onShare}
      />

      {/* Dense flow fills the gaps a missing tile (no hotel, no con) would leave. */}
      <div className="grid grid-flow-dense grid-cols-2 gap-3 lg:grid-cols-4">
        {TILE_ORDER[phase].map((id) => tiles[id] && <Fragment key={id}>{tiles[id]}</Fragment>)}
        {openPanel === "weather" && trip.location && <WeatherPanel ref={panelRef} trip={trip} />}
        {openPanel === "practical" && <PracticalPanel ref={panelRef} info={info} />}
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

      <StoryViewer eventDayId={viewDayId ?? ""} open={viewDayId !== null} onClose={() => setViewDayId(null)} />
    </div>
  );
}

