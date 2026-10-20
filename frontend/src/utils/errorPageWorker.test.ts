// The Cloudflare Worker in cloudflare/ is plain JavaScript with no types of its own.
// @ts-ignore
import worker from "../../../cloudflare/error-page-worker.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (request: Request, init?: { signal?: AbortSignal }) => Promise<Response>;

const request = (method = "GET", accept = "text/html") =>
  new Request("https://con.ankerd.org/some/path", { method, headers: { accept }, body: method === "POST" ? "x" : undefined });

/** An origin that never answers; it only gives up when the Worker aborts. */
const hangs: Handler = (_request, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  });

function origin(handler: Handler) {
  vi.stubGlobal("fetch", vi.fn(handler));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a home server that does not answer", () => {
  it("shows the page load an error after 8 seconds, not Cloudflare's minute and a half", async () => {
    origin(hangs);
    const pending = worker.fetch(request());
    let settled = false;
    pending.then(() => (settled = true));

    await vi.advanceTimersByTimeAsync(7_900);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    const response = await pending;
    expect(response.status).toBe(522);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("522");
  });

  it("gives the app's own reads a little longer, and answers them as JSON", async () => {
    origin(hangs);
    const pending = worker.fetch(request("GET", "application/json"));
    let settled = false;
    pending.then(() => (settled = true));

    await vi.advanceTimersByTimeAsync(10_000);
    expect(settled).toBe(false); // the page-load limit does not apply to an API call

    await vi.advanceTimersByTimeAsync(15_100);
    const response = await pending;
    expect(response.status).toBe(522);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect((await response.json()).detail).toContain("522");
  });

  it("never cuts off a request that sends something: an upload being slow is not the server being down", async () => {
    origin(hangs);
    let settled = false;
    worker.fetch(request("POST", "application/json")).then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(settled).toBe(false);
    expect(fetch).toHaveBeenCalledWith(expect.anything(), undefined);
  });
});

describe("a server that answers", () => {
  it("hands the response back untouched", async () => {
    origin(async () => new Response("hello", { status: 200 }));
    const response = await worker.fetch(request());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
  });

  it("does not leave the timer running after the answer (a long download must not be cut short later)", async () => {
    origin(async () => new Response("zip", { status: 200 }));
    const response = await worker.fetch(request("GET", "application/zip"));
    expect(vi.getTimerCount()).toBe(0);
    expect(await response.text()).toBe("zip");
  });

  it("replaces a 5xx with the branded page for a page load and with JSON for the app", async () => {
    origin(async () => new Response("bad", { status: 502 }));
    const page = await worker.fetch(request());
    expect(page.status).toBe(502);
    expect(page.headers.get("content-type")).toContain("text/html");
    const api = await worker.fetch(request("GET", "application/json"));
    expect(api.headers.get("content-type")).toContain("application/json");
  });

  it("answers a refused connection with a 502", async () => {
    origin(async () => {
      throw new Error("connection refused");
    });
    expect((await worker.fetch(request())).status).toBe(502);
  });
});

it("stays out of the way of a host it is not configured for", async () => {
  origin(async () => new Response("other", { status: 500 }));
  const response = await worker.fetch(new Request("https://elsewhere.example/x", { headers: { accept: "text/html" } }));
  expect(response.status).toBe(500);
  expect(await response.text()).toBe("other");
});
