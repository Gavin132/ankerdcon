import { useAdminEventDays, useAdminEvents } from "../../hooks/useAdmin";
import { EventEditDrawer } from "../../pages/admin/EventEditDrawer";

/**
 * The admin panel's event form, opened over an event page. Loaded only when an
 * admin taps the pencil (see TripEditButton), so members never download it.
 * `eventIds` are the ids of the trip's days, which is how the trip's own event
 * is found among the admin list.
 */
export default function TripEventEditor({ eventIds, onClose }: { eventIds: string[]; onClose: () => void }) {
  const { data: events = [] } = useAdminEvents();
  const { data: days = [] } = useAdminEventDays();

  const eventId = days.find((d) => eventIds.includes(d.id))?.event_id;
  const event = events.find((e) => e.id === eventId) ?? null;
  const eventDays = days.filter((d) => d.event_id === eventId);

  return (
    <EventEditDrawer
      key={event?.id ?? "loading"}
      event={event}
      days={eventDays}
      onClose={onClose}
      onCreated={() => undefined}
    />
  );
}
