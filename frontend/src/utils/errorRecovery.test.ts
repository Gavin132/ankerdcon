import { afterEach, describe, expect, it, vi } from "vitest";
import { attemptAutoReload, resetAppAndReload } from "./errorRecovery";

function stubBrowser(initial: Record<string, string> = {}) {
  const store = { ...initial };
  const reload = vi.fn();
  const assign = vi.fn();
  const removeItem = vi.fn((k: string) => void delete store[k]);
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => void (store[k] = v),
  });
  vi.stubGlobal("localStorage", { removeItem });
  vi.stubGlobal("window", { location: { reload, assign }, localStorage: { removeItem } });
  vi.stubGlobal("navigator", {});
  return { reload, assign, removeItem };
}

afterEach(() => vi.unstubAllGlobals());

describe("attemptAutoReload", () => {
  it("reloads once, then gives up while the cooldown lasts", () => {
    const { reload } = stubBrowser();
    expect(attemptAutoReload()).toBe(true);
    expect(attemptAutoReload()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads again once the cooldown has passed", () => {
    const { reload } = stubBrowser({ "ankerd-error-reload-at": String(Date.now() - 60_000) });
    expect(attemptAutoReload()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("shows the fallback instead of reloading when sessionStorage is unavailable", () => {
    const { reload } = stubBrowser();
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(attemptAutoReload()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("resetAppAndReload", () => {
  it("clears the saved query cache and then reloads", async () => {
    const { reload, assign, removeItem } = stubBrowser();
    await resetAppAndReload();
    expect(removeItem).toHaveBeenCalledWith("ankerd_query_cache");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it("loads the given page from scratch instead of reloading the broken one", async () => {
    const { reload, assign } = stubBrowser();
    await resetAppAndReload("/");
    expect(assign).toHaveBeenCalledWith("/");
    expect(reload).not.toHaveBeenCalled();
  });
});
