import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { Fixtures } from "./fixtures";
import { CATEGORIES, ME, adminEvents, userPhotos } from "./fixtures";
import { archiveAnswer, forecastAnswer, geocodeAnswer } from "./weather";

type Query = URLSearchParams;
type Handler = (m: RegExpMatchArray, q: Query, fx: Fixtures) => unknown;

/** GET routes: path (no trailing slash) to answer. The first that matches wins. */
const GETS: [RegExp, Handler][] = [
  [/^\/api\/users\/me$/, (_m, _q, fx) => fx.me],
  [/^\/api\/users$/, (_m, _q, fx) => fx.users],
  [/^\/api\/users\/([^/]+)$/, (m, _q, fx) => {
    const key = decodeURIComponent(m[1]);
    return fx.users.find((u) => u.id === key || u.name === key) ?? fx.me;
  }],
  [/^\/api\/calendar$/, (_m, _q, fx) => fx.calendar],
  [/^\/api\/calendar\/feed-url$/, () => ({ path: "/api/calendar/feed.ics?token=mock" })],
  [/^\/api\/calendar\/([^/]+)\/hotel-rooms$/, (m, _q, fx) => fx.rooms.filter((r) => r.event_id === decodeURIComponent(m[1]))],
  [/^\/api\/meals$/, (_m, _q, fx) => fx.meals],
  [/^\/api\/meal-categories$/, () => CATEGORIES],
  [/^\/api\/rides$/, (_m, q, fx) => (q.get("direction") ? fx.rides.filter((r) => r.direction === q.get("direction")) : fx.rides)],
  [/^\/api\/rides\/([^/]+)$/, (m, _q, fx) => fx.rides.find((r) => r.id === m[1]) ?? fx.rides[0]],
  [/^\/api\/cosplays$/, (_m, _q, fx) => fx.cosplays],
  [/^\/api\/expenses$/, (_m, _q, fx) => fx.expenses],
  [/^\/api\/settlements$/, (_m, _q, fx) => fx.settle],
  [/^\/api\/ride-costs$/, (_m, _q, fx) => fx.rideCosts],
  [/^\/api\/badges$/, (_m, _q, fx) => fx.badges],
  [/^\/api\/announcements\/active$/, (_m, _q, fx) => fx.announcements],
  [/^\/api\/changelog$/, (_m, _q, fx) => fx.changelog],
  [/^\/api\/parking\/([^/]+)$/, (m, _q, fx) => fx.parking.filter((p) => p.trip_id === decodeURIComponent(m[1]))],
  [/^\/api\/stories\/summary$/, (_m, q, fx) => {
    const wanted = (q.get("event_day_ids") ?? "").split(",").filter(Boolean);
    return Object.fromEntries(Object.entries(fx.storySummary).filter(([id]) => wanted.length === 0 || wanted.includes(id)));
  }],
  [/^\/api\/stories\/user\/([^/]+)$/, (m, _q, fx) => userPhotos(fx, decodeURIComponent(m[1]) === "u-gavin" ? ME : decodeURIComponent(m[1]))],
  [/^\/api\/stories\/([^/]+)\/seen$/, (m) => ({ event_day_id: m[1], last_seen_seq: 0 })],
  [/^\/api\/stories\/([^/]+)$/, (m, _q, fx) => fx.storyDays[m[1]] ?? []],
  [/^\/api\/weather\/geocode$/, (_m, q) => geocodeAnswer(q.get("name") ?? "")],
  [/^\/api\/weather\/forecast$/, (_m, q) => forecastAnswer(q.get("date") ?? "")],
  [/^\/api\/weather\/archive$/, (_m, q) => archiveAnswer(q.get("start_date") ?? "2016-01-01", q.get("end_date") ?? "2025-12-31")],
  [/^\/api\/admin\/stats$/, (_m, _q, fx) => ({ users: fx.users.length, rides: fx.rides.length, meals: fx.meals.length, events: 4 })],
  [/^\/api\/admin\/users$/, (_m, _q, fx) => fx.users],
  [/^\/api\/admin\/rides$/, (_m, _q, fx) => fx.rides],
  [/^\/api\/admin\/meals$/, (_m, _q, fx) => fx.meals],
  [/^\/api\/admin\/meal-categories$/, () => CATEGORIES],
  [/^\/api\/admin\/events$/, (_m, _q, fx) => adminEvents(fx).events],
  [/^\/api\/admin\/event-days$/, (_m, _q, fx) => adminEvents(fx).days],
  [/^\/api\/admin\/event-groups$/, (_m, _q, fx) => [...new Set(fx.calendar.map((d) => d.event_group_id).filter(Boolean))].map((name, i) => ({ id: `g-${i}`, name, created_at: new Date().toISOString() }))],
  [/^\/api\/admin\/whitelist$/, (_m, _q, fx) => fx.whitelist],
  [/^\/api\/admin\/feedback$/, (_m, _q, fx) => fx.feedback],
  [/^\/api\/admin\/announcements$/, (_m, _q, fx) => fx.announcements],
  [/^\/api\/admin\/changelog$/, (_m, _q, fx) => fx.changelog],
  [/^\/api\/admin\/badges$/, (_m, _q, fx) => fx.badges],
  [/^\/api\/admin\/cdn$/, () => ({ total: 0, total_size: 0, capped: false, counts: {}, download_limit_bytes: 1_500_000_000, items: [] })],
];

const SLEEP = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** What a request had no mock for. Read by the audit (`window.__mock.unhandled`), so a screen that looks empty
 * for want of fixtures is not mistaken for a screen that is broken. */
export const unhandled: string[] = [];

export function makeAdapter(fx: Fixtures, delayMs: number): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const url = new URL(config.url ?? "", "http://mock.local");
    const query = new URLSearchParams(url.search);
    for (const [k, v] of Object.entries((config.params ?? {}) as Record<string, unknown>)) query.set(k, String(v));
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = (config.method ?? "get").toLowerCase();

    if (delayMs > 0) await SLEEP(delayMs);

    let data: unknown = method === "get" ? [] : {};
    let status = method === "get" ? 200 : method === "post" ? 201 : 200;
    if (method === "get") {
      const route = GETS.find(([re]) => re.test(path));
      if (route) data = await route[1](path.match(route[0])!, query, fx);
      else if (!unhandled.includes(path)) unhandled.push(path);
    } else {
      // A change is accepted and forgotten: the next read still shows the fixtures.
      status = method === "delete" ? 204 : 200;
    }
    return { data, status, statusText: "OK", headers: {}, config, request: {} };
  };
}
