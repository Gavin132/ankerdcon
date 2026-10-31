import { describe, expect, it } from "vitest";
import { buildTrip, cosplayTripId, visibleTripTabs } from "./trips";
import type { CalendarEvent } from "../types";

const day = (eventType: CalendarEvent["event_type"]) =>
  ({ id: "d1", event_name: "Event", date: "2026-12-12", participants: [], has_con: true, event_type: eventType }) as unknown as CalendarEvent;

describe("cosplay on a trip", () => {
  it("is there for a con and for other kinds of event", () => {
    for (const type of ["con", "gathering", null] as const) {
      const trip = buildTrip([day(type)], "d1")!;
      expect(trip.hasCon).toBe(true);
      expect(visibleTripTabs(trip).map((t) => t.id)).toContain("cosplay");
    }
  });

  it("is not there for a concert, even though the day says has_con", () => {
    const trip = buildTrip([day("concert")], "d1")!;
    expect(trip.hasCon).toBe(false);
    expect(visibleTripTabs(trip).map((t) => t.id)).not.toContain("cosplay");
  });
});

describe("search for a cosplay", () => {
  const con = { ...day("con"), id: "con-day" } as CalendarEvent;
  const concert = { ...day("concert"), id: "concert-day" } as CalendarEvent;
  const events = [con, concert];

  it("leads to the trip's Cosplay sheet for a con", () => {
    expect(cosplayTripId(events, ["con-day"])).toBe("con-day");
  });

  it("leads nowhere for a cosplay linked only to a concert", () => {
    expect(cosplayTripId(events, ["concert-day"])).toBeNull();
  });

  it("skips a concert and takes the first linked trip that has cosplay", () => {
    expect(cosplayTripId(events, ["concert-day", "con-day"])).toBe("con-day");
  });

  it("leads nowhere for an event that no longer exists, or for no link", () => {
    expect(cosplayTripId(events, ["gone"])).toBeNull();
    expect(cosplayTripId(events, [])).toBeNull();
  });
});
