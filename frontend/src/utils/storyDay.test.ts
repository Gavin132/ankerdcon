import { describe, expect, it } from "vitest";
import { routePhotoDay, storyPhotoTotal, type PhotoDay } from "./storyDay";

// A con on Saturday and Sunday, one on Friday to Monday a month later.
const days: PhotoDay[] = [
  { id: "a-sat", dateKey: "2026-11-21" },
  { id: "a-sun", dateKey: "2026-11-22" },
  { id: "b-fri", dateKey: "2026-12-18" },
  { id: "b-sat", dateKey: "2026-12-19" },
  { id: "b-sun", dateKey: "2026-12-20" },
  { id: "b-mon", dateKey: "2026-12-21" },
];

describe("routePhotoDay", () => {
  it("files a photo of an event day under that day", () => {
    expect(routePhotoDay("2026-11-22", days)).toEqual({ eventDayId: "a-sun", takenOn: null });
  });

  it("files a photo of another event entirely under that event", () => {
    expect(routePhotoDay("2026-12-19", days)).toEqual({ eventDayId: "b-sat", takenOn: null });
  });

  it("gives the day before an event a day of its own, kept on the first event day", () => {
    expect(routePhotoDay("2026-11-20", days)).toEqual({ eventDayId: "a-sat", takenOn: "2026-11-20" });
  });

  it("gives the day after an event a day of its own, kept on the last event day", () => {
    expect(routePhotoDay("2026-11-23", days)).toEqual({ eventDayId: "a-sun", takenOn: "2026-11-23" });
    expect(routePhotoDay("2026-12-22", days)).toEqual({ eventDayId: "b-mon", takenOn: "2026-12-22" });
  });

  it("snaps a photo more than a day away to the nearest event day", () => {
    expect(routePhotoDay("2026-11-18", days)).toEqual({ eventDayId: "a-sat", takenOn: null });
    expect(routePhotoDay("2026-11-25", days)).toEqual({ eventDayId: "a-sun", takenOn: null });
    expect(routePhotoDay("2026-12-30", days)).toEqual({ eventDayId: "b-mon", takenOn: null });
  });

  it("does not make a day of its own for one that falls on another event", () => {
    // Monday the 21st is the last day of the second con: a day of it, not an extra day of anything.
    expect(routePhotoDay("2026-12-21", days)).toEqual({ eventDayId: "b-mon", takenOn: null });
  });

  it("takes the earlier day between two equally near ones", () => {
    const two: PhotoDay[] = [{ id: "x", dateKey: "2026-05-01" }, { id: "y", dateKey: "2026-05-05" }];
    expect(routePhotoDay("2026-05-03", two)).toEqual({ eventDayId: "x", takenOn: null });
  });

  it("works across a month and a year end", () => {
    const end: PhotoDay[] = [{ id: "new-year", dateKey: "2027-01-01" }];
    expect(routePhotoDay("2026-12-31", end)).toEqual({ eventDayId: "new-year", takenOn: "2026-12-31" });
  });

  it("gives nothing when there are no event days", () => {
    expect(routePhotoDay("2026-11-20", [])).toBeNull();
  });
});

describe("storyPhotoTotal", () => {
  it("adds the days beside the event to the event day", () => {
    const summary = { photo_count: 3, latest_seq: 9, has_unseen: false, preview_url: "", extra_days: [{ date: "2026-11-20", photo_count: 2, preview_url: "" }] };
    expect(storyPhotoTotal(summary)).toBe(5);
    expect(storyPhotoTotal(undefined)).toBe(0);
  });
});
