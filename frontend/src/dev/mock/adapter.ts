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
  [/^\/api\/ticket-polls\/([^/]+)$/, (m, _q, fx) => fx.ticketPolls.find((p) => p.trip_id === decodeURIComponent(m[1])) ?? null],
  [/^\/api\/stories\/summary$/, (_m, q, fx) => {
    const wanted = (q.get("event_day_ids") ?? "").split(",").filter(Boolean);
    return Object.fromEntries(Object.entries(fx.storySummary).filter(([id]) => wanted.length === 0 || wanted.includes(id)));
  }],
  [/^\/api\/stories\/user\/([^/]+)$/, (m, _q, fx) => userPhotos(fx, decodeURIComponent(m[1]) === "u-gavin" ? ME : decodeURIComponent(m[1]))],
  [/^\/api\/stories\/([^/]+)\/seen$/, (m) => ({ event_day_id: m[1], last_seen_seq: 0 })],
  [/^\/api\/stories\/([^/]+)$/, (m, q, fx) => (fx.storyDays[m[1]] ?? []).filter((p) => (p.taken_on ?? null) === (q.get("taken_on") ?? null))],
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

/** What merging a placeholder would move, counted from the made-up data (the real count is the server's). */
function mergeAnswer(fx: Fixtures, sourceId: string, body: { target_id?: string; dry_run?: boolean }) {
  const source = fx.users.find((u) => u.id === sourceId);
  const target = fx.users.find((u) => u.id === body.target_id);
  if (!source || !target) return { error: "Gebruiker niet gevonden. Ververs de pagina en probeer het opnieuw.", status: 404 };
  if (source.is_placeholder !== true) {
    return { error: `${source.name} is al ingelogd en is geen placeholder. Je kunt alleen een placeholder samenvoegen: kies een ander profiel.`, status: 400 };
  }
  if (target.is_placeholder) {
    return { error: `${target.name} is zelf een placeholder en heeft nog niet ingelogd. Kies een lid dat al is ingelogd.`, status: 400 };
  }
  const name = source.name;
  const counts = {
    rides: fx.rides.filter((r) => r.driver === name || r.passengers.includes(name)).length,
    meals: fx.meals.filter((m) => m.participants?.includes(name)).length,
    trip_days: fx.calendar.filter((d) => d.participants?.includes(name)).length,
    hotel_rooms: fx.rooms.filter((r) => r.occupants?.includes(name)).length,
    expenses: fx.expenses.filter((e) => e.paid_by === name).length,
    expense_shares: fx.expenses.flatMap((e) => e.shares ?? []).filter((s) => s.participant === name).length,
    settlements: 0, cosplays: fx.cosplays.filter((c) => c.user_name === name).length,
    photos: Object.values(fx.storyDays).flat().filter((p) => p.uploaded_by === name).length,
    stories_seen: 0, ride_costs: 0, parking_spots: 0, feedback: 0, push_subscriptions: 0, ticket_votes: 0,
    badges: (source.badge_ids ?? []).filter((b) => !(target.badge_ids ?? []).includes(b)).length,
  };
  // The one thing the demo drops, so the "niet overgenomen" line has something to show.
  const dropped = { settlements: counts.expense_shares > 0 ? 1 : 0, ride_costs: 0, parking_spots: 0, restaurant_cars: 0 };
  return { dry_run: body.dry_run !== false, source_name: name, target_name: target.name, counts, dropped, alias_names: [name] };
}

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
      const merge = method === "post" ? path.match(/^\/api\/admin\/users\/([^/]+)\/merge$/) : null;
      if (merge) {
        const body = typeof config.data === "string" ? JSON.parse(config.data) : (config.data ?? {});
        const answer = mergeAnswer(fx, decodeURIComponent(merge[1]), body);
        if ("error" in answer) {
          // Like a refused request from the server: axios rejects, the client turns the detail into the message.
          return Promise.reject(Object.assign(new Error(answer.error), {
            isAxiosError: true, config, response: { data: { detail: answer.error }, status: answer.status, statusText: "Error", headers: {}, config },
          }));
        }
        data = answer;
        status = 200;
      }
    }
    return { data, status, statusText: "OK", headers: {}, config, request: {} };
  };
}
