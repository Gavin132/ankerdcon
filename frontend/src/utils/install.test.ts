import { afterEach, describe, expect, it, vi } from "vitest";
import { DISMISS_DAYS, dismissInstallHint, installHintDismissed, installKind } from "./install";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

const DAY = 24 * 60 * 60 * 1000;

describe("the install card's 'not now'", () => {
  it("is not dismissed until someone dismisses it", () => {
    fakeStorage();
    expect(installHintDismissed()).toBe(false);
  });

  it("stays away for 30 days, then comes back", () => {
    fakeStorage();
    const t0 = Date.parse("2026-10-15T12:00:00Z");
    dismissInstallHint(t0);
    expect(installHintDismissed(t0 + 1000)).toBe(true);
    expect(installHintDismissed(t0 + (DISMISS_DAYS - 1) * DAY)).toBe(true);
    expect(installHintDismissed(t0 + DISMISS_DAYS * DAY + 1)).toBe(false);
  });

  it("copes with storage that is blocked or holds rubbish", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(installHintDismissed()).toBe(false);
    expect(() => dismissInstallHint()).not.toThrow();
    fakeStorage({ "ankerd:install-hint-dismissed": "not a number" });
    expect(installHintDismissed()).toBe(false);
  });
});

describe("installKind", () => {
  it("is nothing outside a browser", () => {
    expect(installKind()).toBeNull();
  });
});
