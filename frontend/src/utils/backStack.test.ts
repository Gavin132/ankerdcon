import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openBackEntry, resetBackStack } from "./backStack";

/** Just enough of a browser window for history entries and popstate. */
function fakeWindow() {
  const listeners = new Set<() => void>();
  const entries: unknown[] = [{ idx: 0 }];
  let at = 0;
  const win = {
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    addEventListener: (type: string, l: () => void) => void (type === "popstate" && listeners.add(l)),
    removeEventListener: (type: string, l: () => void) => void (type === "popstate" && listeners.delete(l)),
    history: {
      get state() {
        return entries[at];
      },
      pushState: (state: unknown) => {
        entries.splice(at + 1);
        entries.push(state);
        at++;
      },
      back: () => {
        if (at > 0) {
          at--;
          [...listeners].forEach((l) => l());
        }
      },
      // The router moving on without going through us.
      replaceState: (state: unknown) => void (entries[at] = state),
    },
  };
  vi.stubGlobal("window", win);
  return { win, depth: () => at, listeners };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  resetBackStack();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("openBackEntry", () => {
  it("gives an open overlay a history entry, so the back gesture has something to consume", () => {
    const { depth } = fakeWindow();
    openBackEntry(() => {});
    expect(depth()).toBe(0); // deferred a tick
    vi.runAllTimers();
    expect(depth()).toBe(1);
  });

  it("closes the overlay on the back gesture, and leaves no entry behind", () => {
    const { win, depth } = fakeWindow();
    const close = vi.fn();
    const release = openBackEntry(close);
    vi.runAllTimers();

    win.history.back(); // the gesture
    expect(close).toHaveBeenCalledTimes(1);
    release(); // the parent unmounts the overlay in response
    expect(depth()).toBe(0);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("takes its entry away again when the overlay is closed by hand", () => {
    const { depth } = fakeWindow();
    const close = vi.fn();
    const release = openBackEntry(close);
    vi.runAllTimers();
    expect(depth()).toBe(1);

    release(); // the X
    expect(depth()).toBe(0);
    expect(close).not.toHaveBeenCalled(); // closing by hand is not the gesture
  });

  it("closes only the overlay on top when two are open", () => {
    const { win, depth } = fakeWindow();
    const lower = vi.fn();
    const upper = vi.fn();
    openBackEntry(lower);
    vi.runAllTimers();
    openBackEntry(upper);
    vi.runAllTimers();
    expect(depth()).toBe(2);

    win.history.back();
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
    win.history.back();
    expect(lower).toHaveBeenCalledTimes(1);
  });

  it("pushes nothing when the overlay is cleaned up before the tick (React StrictMode's first mount)", () => {
    const { depth } = fakeWindow();
    const release = openBackEntry(() => {});
    release();
    vi.runAllTimers();
    expect(depth()).toBe(0);
  });

  it("does not undo a navigation the router made in the meantime", () => {
    const { win, depth } = fakeWindow();
    const release = openBackEntry(() => {});
    vi.runAllTimers();
    win.history.replaceState({ idx: 5 }); // the page moved on and the entry is no longer ours
    release();
    expect(depth()).toBe(1);
  });

  it("stops listening once the last overlay is gone", () => {
    const { listeners } = fakeWindow();
    const a = openBackEntry(() => {});
    const b = openBackEntry(() => {});
    vi.runAllTimers();
    expect(listeners.size).toBe(1);
    a();
    b();
    expect(listeners.size).toBe(0);
  });
});
