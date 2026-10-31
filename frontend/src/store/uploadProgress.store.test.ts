import { beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "../lib/api/client";
import { overallProgress, useUploadProgressStore } from "./uploadProgress.store";

beforeEach(() => useUploadProgressStore.setState({ active: {} }));

describe("overallProgress", () => {
  it("is nothing while nothing uploads", () => {
    expect(overallProgress({})).toBeNull();
  });

  it("is the bytes sent over the bytes in all, across uploads that run together", () => {
    expect(overallProgress({ a: { loaded: 50, total: 100 } })).toBe(50);
    expect(overallProgress({ a: { loaded: 100, total: 100 }, b: { loaded: 0, total: 300 } })).toBe(25);
  });
});

describe("the API client reports uploads", () => {
  type Handlers = { fulfilled?: (v: unknown) => unknown; rejected?: (e: unknown) => unknown }[];
  const requestHandlers = () => (apiClient.interceptors.request as unknown as { handlers: Handlers }).handlers;
  const responseHandlers = () => (apiClient.interceptors.response as unknown as { handlers: Handlers }).handlers;

  async function sent(data: unknown) {
    let config: unknown = { headers: {}, url: "/x", method: "post", timeout: 30_000, data };
    for (const h of requestHandlers()) if (h?.fulfilled) config = await h.fulfilled(config);
    return config as { onUploadProgress?: (e: { loaded: number; total?: number }) => void };
  }

  it("follows a request that carries a file, and lets go of it when the answer comes", async () => {
    const config = await sent(new FormData());
    config.onUploadProgress?.({ loaded: 30, total: 120 });
    expect(overallProgress(useUploadProgressStore.getState().active)).toBe(25);

    // the first response handler is the one that lets go
    await responseHandlers()[0].fulfilled?.({ config });
    expect(useUploadProgressStore.getState().active).toEqual({});
  });

  it("lets go of it too when the request fails", async () => {
    const config = await sent(new FormData());
    config.onUploadProgress?.({ loaded: 10, total: 100 });
    await expect(Promise.resolve(responseHandlers()[0].rejected?.({ config }))).rejects.toBeTruthy();
    expect(useUploadProgressStore.getState().active).toEqual({});
  });

  it("keeps the caller's own progress callback working", async () => {
    const seen: number[] = [];
    let config: unknown = { headers: {}, url: "/x", method: "post", timeout: 30_000, data: new FormData(), onUploadProgress: (e: { loaded: number }) => seen.push(e.loaded) };
    for (const h of requestHandlers()) if (h?.fulfilled) config = await h.fulfilled(config);
    (config as { onUploadProgress: (e: { loaded: number; total: number }) => void }).onUploadProgress({ loaded: 7, total: 10 });
    expect(seen).toEqual([7]);
  });

  it("ignores a request that carries no file", async () => {
    const config = await sent({ a: 1 });
    expect(config.onUploadProgress).toBeUndefined();
  });
});
