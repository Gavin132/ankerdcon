import { describe, expect, it } from "vitest";
import { defaultTransportView, dayForDateKey } from "./transportView";
import { buildTrip } from "./trips";
import type { CalendarEvent, Meal } from "../types";

const day = (id: string, date: string, isHotel: boolean) =>
  ({ id, multi_day_id: "trip", event_name: "HMIA", date, is_hotel: isHotel, has_con: true, participants: [] }) as unknown as CalendarEvent;

const trip = (isHotel: boolean) =>
  buildTrip([day("sat", "2026-11-21", isHotel), day("sun", "2026-11-22", isHotel)], "trip")!;

const meal = (time: string, transportNeeded = true) =>
  ({ id: "m1", linked_event_id: "sat", time, transport_needed: transportNeeded }) as unknown as Meal;

// 21 November 2026 is a Saturday. Months are 0-based in Date.
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);

describe("defaultTransportView", () => {
  it("opens on Heen and the first day before the trip", () => {
    expect(defaultTransportView(trip(true), [], at(10, 15))).toEqual({ direction: "Inbound", dayId: "sat" });
  });

  it("opens on Heen in the morning of a trip day", () => {
    expect(defaultTransportView(trip(true), [], at(21, 10))).toEqual({ direction: "Inbound", dayId: "sat" });
  });

  it("opens on Terug from the afternoon, on that same day", () => {
    expect(defaultTransportView(trip(true), [], at(21, 15))).toEqual({ direction: "Outbound", dayId: "sat" });
  });

  it("flips to Heen on tomorrow's day late in the evening", () => {
    expect(defaultTransportView(trip(true), [], at(21, 22))).toEqual({ direction: "Inbound", dayId: "sun" });
  });

  it("stays on Terug, on the last day, once the trip is over", () => {
    expect(defaultTransportView(trip(true), [], at(25, 12))).toEqual({ direction: "Outbound", dayId: "sun" });
  });

  it("opens on Eten when a meal still to come needs transport and there is no hotel", () => {
    const m = [meal("2026-11-21T19:00")];
    expect(defaultTransportView(trip(false), m, at(21, 15))).toEqual({ direction: "Restaurant", dayId: "sat" });
  });

  it("ignores a meal that has already started, needs no transport, or belongs to a hotel trip", () => {
    expect(defaultTransportView(trip(false), [meal("2026-11-21T12:00")], at(21, 15)).direction).toBe("Outbound");
    expect(defaultTransportView(trip(false), [meal("2026-11-21T19:00", false)], at(21, 15)).direction).toBe("Outbound");
    expect(defaultTransportView(trip(true), [meal("2026-11-21T19:00")], at(21, 15)).direction).toBe("Outbound");
  });
});

describe("dayForDateKey", () => {
  const days = trip(true).days;

  it("finds the day with that date", () => {
    expect(dayForDateKey(days, "2026-11-22")).toBe("sun");
  });

  it("falls back to the next day, then the last", () => {
    expect(dayForDateKey(days, "2026-11-01")).toBe("sat");
    expect(dayForDateKey(days, "2026-12-01")).toBe("sun");
  });
});
