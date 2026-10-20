import { describe, expect, it } from "vitest";
import { apiClient, GET_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from "./client";

/** Runs a request config through the client's request interceptors, as axios would before sending it. */
async function prepared(config: { method?: string; timeout?: number }) {
  // axios keeps its interceptors in a private list; the first is the one that adds the token and the timeout.
  const handlers = (apiClient.interceptors.request as unknown as { handlers: { fulfilled: (c: unknown) => unknown }[] }).handlers;
  let out: unknown = { headers: {}, url: "/x", timeout: REQUEST_TIMEOUT_MS, ...config };
  for (const h of handlers) if (h?.fulfilled) out = await h.fulfilled(out);
  return out as { timeout: number };
}

describe("how long a request may take", () => {
  it("is shorter for a read, so a server that is off is noticed in 15 seconds, not 30", async () => {
    expect(GET_TIMEOUT_MS).toBeLessThan(REQUEST_TIMEOUT_MS);
    expect((await prepared({ method: "get" })).timeout).toBe(GET_TIMEOUT_MS);
    expect((await prepared({ method: "GET" })).timeout).toBe(GET_TIMEOUT_MS);
  });

  it("stays long for a change, which may be doing real work", async () => {
    expect((await prepared({ method: "post" })).timeout).toBe(REQUEST_TIMEOUT_MS);
    expect((await prepared({ method: "put" })).timeout).toBe(REQUEST_TIMEOUT_MS);
  });

  it("leaves a call that set its own limit alone (a zip has none, a video upload a long one)", async () => {
    expect((await prepared({ method: "get", timeout: 0 })).timeout).toBe(0);
    expect((await prepared({ method: "get", timeout: 100_000 })).timeout).toBe(100_000);
  });
});
