import { describe, expect, it } from "vitest";
import { defaultRideEnds } from "./rideLocations";

const base = { dayCount: 3, venue: "Brussel Expo", hotel: "Hotel Ibis", isHotel: true };

describe("defaultRideEnds", () => {
  it("Heen on the first day comes from home, not from the hotel", () => {
    expect(defaultRideEnds({ ...base, direction: "Inbound", dayIndex: 0 })).toEqual({ start: "", end: "Brussel Expo" });
  });

  it("Heen on a later day starts at the hotel", () => {
    expect(defaultRideEnds({ ...base, direction: "Inbound", dayIndex: 1 })).toEqual({ start: "Hotel Ibis", end: "Brussel Expo" });
    expect(defaultRideEnds({ ...base, direction: "Inbound", dayIndex: 2 })).toEqual({ start: "Hotel Ibis", end: "Brussel Expo" });
  });

  it("Terug before the last day goes back to the hotel", () => {
    expect(defaultRideEnds({ ...base, direction: "Outbound", dayIndex: 0 })).toEqual({ start: "Brussel Expo", end: "Hotel Ibis" });
    expect(defaultRideEnds({ ...base, direction: "Outbound", dayIndex: 1 })).toEqual({ start: "Brussel Expo", end: "Hotel Ibis" });
  });

  it("Terug on the last day goes home", () => {
    expect(defaultRideEnds({ ...base, direction: "Outbound", dayIndex: 2 })).toEqual({ start: "Brussel Expo", end: "" });
  });

  it("never fills in a hotel for a trip without one", () => {
    const noHotel = { ...base, isHotel: false };
    expect(defaultRideEnds({ ...noHotel, direction: "Inbound", dayIndex: 1 }).start).toBe("");
    expect(defaultRideEnds({ ...noHotel, direction: "Outbound", dayIndex: 0 }).end).toBe("");
  });

  it("does not invent an address when the hotel has none", () => {
    const noAddress = { ...base, hotel: "" };
    expect(defaultRideEnds({ ...noAddress, direction: "Inbound", dayIndex: 1 }).start).toBe("");
  });

  it("leaves the hotel out for a ride that is not on a day of the trip", () => {
    expect(defaultRideEnds({ ...base, direction: "Inbound", dayIndex: -1 }).start).toBe("");
    expect(defaultRideEnds({ ...base, direction: "Outbound", dayIndex: -1 }).end).toBe("");
  });

  it("a one-day trip is both the first and the last day", () => {
    const single = { ...base, dayCount: 1 };
    expect(defaultRideEnds({ ...single, direction: "Inbound", dayIndex: 0 }).start).toBe("");
    expect(defaultRideEnds({ ...single, direction: "Outbound", dayIndex: 0 }).end).toBe("");
  });

  it("fills in nothing for a restaurant ride", () => {
    expect(defaultRideEnds({ ...base, direction: "Restaurant", dayIndex: 0 })).toEqual({ start: "", end: "" });
  });
});
