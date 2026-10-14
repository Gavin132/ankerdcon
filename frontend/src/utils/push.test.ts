import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({ VAPID_PUBLIC_KEY: "key" }));
vi.mock("../config/env", () => ({ env: envMock }));

import { getPushState, immediatePushState } from "./push";

interface Setup {
  permission?: NotificationPermission;
  userAgent?: string;
  registration?: unknown;
  standalone?: boolean;
}

function browser({ permission = "default", userAgent = "Mozilla/5.0 (Windows NT 10.0)", registration, standalone = false }: Setup = {}) {
  const getRegistration = vi.fn(async () => registration);
  const ready = vi.fn();
  vi.stubGlobal("window", {
    PushManager: {},
    Notification: {},
    matchMedia: () => ({ matches: standalone }),
    // Looked up at call time, so fake timers take effect.
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  });
  vi.stubGlobal("Notification", { permission });
  vi.stubGlobal("navigator", {
    userAgent,
    serviceWorker: { getRegistration, get ready() { ready(); return new Promise(() => {}); } },
  });
  return { getRegistration, ready };
}

const subscribed = { pushManager: { getSubscription: async () => ({ endpoint: "https://push/x" }) } };
const notSubscribed = { pushManager: { getSubscription: async () => null } };

beforeEach(() => {
  envMock.VAPID_PUBLIC_KEY = "key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("immediatePushState", () => {
  it("knows at once when push is not available", () => {
    envMock.VAPID_PUBLIC_KEY = "";
    browser();
    expect(immediatePushState()).toBe("unsupported");
  });

  it("knows at once that an iPhone needs the app on the home screen first", () => {
    browser({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
    expect(immediatePushState()).toBe("needs-install");
  });

  it("knows at once that notifications are blocked", () => {
    browser({ permission: "denied" });
    expect(immediatePushState()).toBe("denied");
  });

  it("leaves only the subscription to be looked up otherwise", () => {
    browser();
    expect(immediatePushState()).toBeNull();
  });
});

describe("getPushState", () => {
  it("is off right away when no service worker is registered, without waiting for one", async () => {
    const { getRegistration, ready } = browser({ registration: undefined });
    await expect(getPushState()).resolves.toBe("off");
    expect(getRegistration).toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
  });

  it("is on when this device is subscribed", async () => {
    browser({ registration: subscribed });
    await expect(getPushState()).resolves.toBe("on");
  });

  it("is off when it is not", async () => {
    browser({ registration: notSubscribed });
    await expect(getPushState()).resolves.toBe("off");
  });

  it("gives up on a browser that never answers", async () => {
    vi.useFakeTimers();
    browser({ registration: { pushManager: { getSubscription: () => new Promise(() => {}) } } });
    const state = getPushState();
    await vi.advanceTimersByTimeAsync(2000);
    await expect(state).resolves.toBe("off");
  });

  it("does not look anything up when push cannot work here", async () => {
    const { getRegistration } = browser({ permission: "denied" });
    await expect(getPushState()).resolves.toBe("denied");
    expect(getRegistration).not.toHaveBeenCalled();
  });
});
