import { useMemo } from "react";
import { useCurrentUser } from "./useUsers";
import { useLeaveCalendarEvent, useRsvpCalendarEvent } from "./useCalendar";
import { toast } from "../store/toast.store";
import { dayShort } from "../utils/multiDay";
import type { Trip, TripDay } from "../utils/trips";

/**
 * Signing up for trips, shared by the Agenda and the Event tab: yourself for
 * the whole trip or one day, or anyone for any days via the manage modal.
 * Mutations run one at a time — each call snapshots the calendar cache for
 * its optimistic update, so parallel calls would overwrite each other.
 */
export function useTripRsvp() {
  const { data: me } = useCurrentUser();
  const rsvpMutation = useRsvpCalendarEvent();
  const leaveMutation = useLeaveCalendarEvent();

  /** Every name the signed-in user can appear under in `participants`. */
  const myNames = useMemo(
    () => (me ? [me.name, me.discord_username, ...(me.aliases ?? [])].filter((n): n is string => !!n) : []),
    [me],
  );

  async function rsvp(id: string, userNames: string[]) {
    for (const userName of userNames) {
      try {
        await rsvpMutation.mutateAsync({ id, userName });
      } catch {
        // silently ignore duplicate sign-ups
      }
    }
  }

  async function leave(id: string, userNames: string[]) {
    for (const userName of userNames) {
      try {
        await leaveMutation.mutateAsync({ id, userName });
      } catch {
        // silently ignore if not found
      }
    }
  }

  const myNamesOn = (day: TripDay) => day.ev.participants.filter((p) => myNames.includes(p));

  /** Sign yourself up for every day of the trip you aren't on yet. */
  async function joinTrip(trip: Trip) {
    if (!me) return;
    for (const d of trip.days.filter((day) => myNamesOn(day).length === 0)) await rsvp(d.ev.id, [me.name]);
    toast("success", `Je gaat mee naar ${trip.title}`);
  }

  /** Sign yourself off every day of the trip, under whichever name you're listed. */
  async function leaveTrip(trip: Trip) {
    for (const d of trip.days) await leave(d.ev.id, myNamesOn(d));
    toast("success", `Afgemeld voor ${trip.title}`);
  }

  /** Sign yourself up for one day, or off it when you're already going. Returns true when you joined. */
  async function toggleDay(day: TripDay): Promise<boolean> {
    if (!me) return false;
    const label = `${dayShort(day.date)} ${day.date.getDate()}`;
    const listed = myNamesOn(day);
    if (listed.length > 0) {
      await leave(day.ev.id, listed);
      toast("success", `Afgemeld voor ${label}`);
      return false;
    }
    await rsvp(day.ev.id, [me.name]);
    toast("success", `Aangemeld voor ${label}`);
    return true;
  }

  async function manageRsvp(mode: "join" | "leave", names: string[], eventIds: string[]) {
    for (const id of eventIds) {
      if (mode === "join") await rsvp(id, names);
      else await leave(id, names);
    }
  }

  return { me, myNames, joinTrip, leaveTrip, toggleDay, manageRsvp };
}
