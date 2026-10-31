/**
 * Read-only members ("kijkers"). The backend is what enforces it (every request that changes something
 * is refused, see `get_current_user` in backend/app/dependencies.py); this is the mirror that lets the
 * app say so instead of failing: a change a viewer attempts is not sent, and says why once.
 */
export const READ_ONLY_MESSAGE = "Je account is alleen-lezen: je kunt meekijken, maar niets aanpassen.";

let viewer = false;

export function setViewerMode(on: boolean): void {
  viewer = on;
}

export function isViewerMode(): boolean {
  return viewer;
}

const SAFE_METHODS = new Set(["get", "head", "options"]);

/** What a read-only member may still change: their own account, and what merely looking records.
 * Keep in step with `_VIEWER_WRITABLE` in backend/app/dependencies.py. */
const WRITABLE: { methods: string[]; path: RegExp }[] = [
  { methods: ["put"], path: /^\/api\/users\/preferences$/ },
  { methods: ["post"], path: /^\/api\/users\/me\/onboarding$/ },
  { methods: ["post"], path: /^\/api\/users\/me\/test-notification$/ },
  { methods: ["post", "delete"], path: /^\/api\/users\/(avatar|banner)$/ },
  { methods: ["post"], path: /^\/api\/users\/me\/link-discord$/ },
  { methods: ["delete"], path: /^\/api\/users\/me\/discord$/ },
  { methods: ["post"], path: /^\/api\/users\/me\/deletion-request$/ },
  { methods: ["post", "delete"], path: /^\/api\/push\/subscribe$/ },
  { methods: ["post"], path: /^\/api\/feedback\/?$/ },
  { methods: ["put"], path: /^\/api\/stories\/[^/]+\/seen$/ },
];

/** The path of a request URL, whether it is relative or absolute and with or without a query. */
function pathOf(url: string): string {
  try {
    return new URL(url, "http://local").pathname;
  } catch {
    return url.split("?")[0];
  }
}

export function viewerMayRequest(method: string, url: string): boolean {
  const m = method.toLowerCase();
  if (SAFE_METHODS.has(m)) return true;
  const path = pathOf(url);
  return WRITABLE.some((w) => w.methods.includes(m) && w.path.test(path));
}
