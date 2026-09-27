# Branded Cloudflare error page

A Cloudflare Worker (`cloudflare/error-page-worker.js`) that replaces Cloudflare's own
502/503/504/52x error pages with one styled like the app's own error screens — same logo,
ink-outline look and "Bekijk de serverstatus" link as `ErrorFallback` and `ServerUnreachable`
in the frontend — while still showing the real error code.

- [Why a Worker, not Cloudflare's "Custom Error Pages"](#why-a-worker-not-cloudflares-custom-error-pages)
- [What it does](#what-it-does)
- [The one thing it can't guarantee](#the-one-thing-it-cant-guarantee)
- [Deploying it](#deploying-it)
- [Testing it](#testing-it)
- [Adding another hostname](#adding-another-hostname)
- [Updating the logo](#updating-the-logo)

---

## Why a Worker, not Cloudflare's "Custom Error Pages"

Cloudflare does have a dashboard feature for this ("Custom Errors" / "Custom Pages"), but it
doesn't fit here:

- It's only available on **paid zone plans**, not the Free plan.
- Even on a paid plan, it explicitly **excludes error 521 and 522** — exactly the codes a
  home-hosted origin produces when it's off or unreachable, which is the main case worth
  covering.

A Worker has neither limitation, runs on the **Free** plan (100,000 requests/day, far more
than this app needs), and can show different copy for different codes instead of one static
page for everything.

## What it does

On every request to a configured hostname, the Worker fetches the origin and:

- **If it answers normally** (anything under 500), the response is handed straight back,
  unchanged. The cost is one extra hop at Cloudflare's edge — sub-millisecond, not
  noticeable.
- **If it answers with a 5xx**, or the fetch fails outright (origin unreachable), the Worker
  returns the branded page instead, with the real status code in the small pill at the
  bottom and a plain-language cause per code (`KNOWN` in the script — 500, 502, 503, 504,
  520, 521, 522, 523, 525, 526).
- **Only for a real browser page load.** It checks the request's `Accept` header for
  `text/html` before substituting the branded page. An API call or asset request gets the
  original status back with a small JSON body (`{"detail": "..."}`) instead — so if the app
  itself is running but its API can't be reached, the frontend's own handling
  (`ApiError`, `ServerUnreachable.tsx`) still runs exactly as designed. This page only
  replaces what happens when the site doesn't load *at all*.
- **The logo is embedded** as a data URI in the script, not fetched from the (possibly down)
  origin, so it still shows when nothing else does.

## The one thing it can't guarantee

For **502/503/504** — the origin answers, just with an error — this is completely reliable:
the reverse proxy (SWAG/nginx) is up and gives the Worker something to see, so the Worker's
own `fetch()` gets a normal response with a 5xx status, and the branded page always shows.
This is what happens every time the backend container restarts or redeploys, which is the
most common real case for this app.

For a **totally unreachable origin** (521/522/523: the home server is off, the router's port
forward broke, the LAN is down) — the Worker's `fetch()` to the origin is expected to reject
with a catchable error, which is what the `catch` block is for. In practice this is reported
to sometimes not happen: depending on exactly how the connection fails, Cloudflare's edge can
short-circuit straight to its own default error page before the Worker's `catch` gets a
chance to run, bypassing the Worker's code entirely. There's no dashboard setting that fixes
this — it depends on the specific failure. **Test it** (below) rather than assume; if
Cloudflare's own page still shows for a fully-down origin in practice, there is currently no
further fix on the Free plan, since the paid "Custom Error Pages" feature excludes these same
codes anyway.

## Deploying it

1. **Cloudflare dashboard → Workers & Pages → Create → Create Worker.** Name it something
   like `ankerd-error-page`.
2. Open its editor and replace the default script with the contents of
   `cloudflare/error-page-worker.js`, then **Deploy**.
3. **Add it to both hostnames**, via **Workers & Pages → (the worker) → Settings → Triggers
   → Add Route**, once for each:
   - Route: `con.ankerd.org/*` — Zone: `ankerd.org`
   - Route: `dev.ankerd.org/*` — Zone: `ankerd.org`

   (Routes, not a Workers "Custom Domain" — a Custom Domain makes the Worker the DNS target
   itself, which is a different setup than the existing proxied DNS records pointing at the
   home server; Routes run the Worker in front of the DNS record that's already there.)
4. No environment variables or secrets are needed — the script is self-contained.

## Testing it

The only way to know whether the 521/522 case (above) actually shows the branded page on this
account is to cause it and look:

1. Stop the `con-backend` (or `dev-backend`) container in Portainer.
2. Visit the site fresh — a hard refresh, or a private/incognito window, so nothing cached
   answers instead.
3. You should see the branded page with **502** in the pill (that's the code this Worker uses
   for "origin unreachable" — see the comment in the script for why). If Cloudflare's own
   default error page shows instead, the short-circuit case above is happening on this
   account for this kind of failure, and there's nothing further to configure — the 5xx case
   (below) still works.
4. Separately, to see the "origin answers, but with an error" case (which is the reliable
   one): while the container is still stopped, SWAG/nginx itself is still up and will answer
   with its own 502 — the same test as above already covers this, since that's exactly what
   "backend container down, reverse proxy up" looks like.
5. Start the container again afterwards.

## Adding another hostname

Add a line to the `SITES` object at the top of the script (hostname → the name shown as the
page's title), redeploy the Worker, and add a matching Route. `cdn.ankerd.org` (MinIO) isn't
included by default — a MinIO outage isn't really "Ankerd Con is down", so it was left out;
add it the same way if you want the same page there too.

## Updating the logo

The logo is baked into the script as a base64 data URI (`LOGO_DATA_URI`). Regenerate it if
`frontend/public/assets/images/ankerd-logo.webp` ever changes:

```bash
python -c "import base64; print(base64.b64encode(open('frontend/public/assets/images/ankerd-logo.webp','rb').read()).decode())"
```

Paste the output in place of the existing string in `LOGO_DATA_URI`, in both the repository
file and the Worker's own editor (or redeploy from the repository file).
