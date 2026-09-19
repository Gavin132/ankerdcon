# Setting up MinIO for event-day photo stories

**Status: done.** This is the actual working setup for this instance
(`cdn.ankerd.org`), kept here in case it's ever redeployed. It differs from a
generic MinIO+SWAG guide in a couple of specific ways that turned out to
matter for this Portainer/SWAG setup — see the notes below each step.

Every image the app uploads lives in the one `story-photos` bucket, a folder
per kind:

| Folder | What |
|---|---|
| `<event id>/<day id>/` | Story photos |
| `cosplay/` | Cosplay inspiration images |
| `event-covers/` | Event covers (admins) |
| `badges/` | Badge images (admins) |
| `banners/<user id>/` | Profile banners |

Event covers, badges and banners uploaded before they moved here still live
in Supabase Storage (buckets `event-covers`, `badges`, `banners`) and keep
working from there.

## 1. Deploy MinIO as a Portainer stack

```yaml
services:
  minio:
    image: quay.io/minio/minio:latest   # NOT minio/minio — see note
    container_name: minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: <your admin username>
      MINIO_ROOT_PASSWORD: <your admin password>
    ports:
      - "9002:9000"   # S3 API — NOT 9000:9000, see note
      - "9001:9001"   # console — LAN-only

volumes:
  minio_data:
```

- **Port 9000 is taken by Portainer itself** (Portainer's classic web UI
  defaults to host port 9000) — mapping MinIO's S3 API to host `9000` collides
  with it, and whichever one wins the race answers instead of MinIO. Map it to
  a different host port instead (`9002` here) — the container still listens
  on `9000` internally, only the host-side mapping changes.
- **Pull from `quay.io`, not Docker Hub.** MinIO stopped publishing to Docker
  Hub in 2025: `minio/minio` and `minio/mc` there now return "pull access
  denied … repository does not exist". The same images still live at
  `quay.io/minio/minio` and `quay.io/minio/mc`. An already-running container
  keeps working off its cached image — it only breaks the moment the stack is
  redeployed with a fresh pull, which is the worst time to find out. To avoid
  a surprise version change when switching, pin to the release you already
  run: `docker exec minio minio --version` prints it, and
  `quay.io/minio/minio:RELEASE.<that date>` is the matching image.
- No `networks:` section needed — this SWAG setup reaches other services by
  **LAN IP**, not Docker container name (see step 2), so MinIO doesn't need to
  share a Docker network with SWAG at all.
- Root user/password is the full-admin login, not the app's access key
  (that's step 3).

## 2. Bucket policy + access key — via the `mc` CLI, not the console

Recent MinIO's free "Community Edition" console dropped the GUI for both
anonymous-access policies and access-key management, so this goes through
`mc` in a throwaway container instead:

Anonymous visitors may read a photo when they know its URL, and nothing else.
Don't use `mc anonymous set download` for this: MinIO's canned "download"
policy also grants `s3:ListBucket`, so anyone could list every photo in the
bucket. Save this as `read-only.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": ["*"] },
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::story-photos/*"]
  }]
}
```

and apply it, then (first-time setup only — the app's key is already set)
create the app's access key:

```bash
MC_HOST_local="http://<root_user>:<root_password>@127.0.0.1:9002"
docker run --rm --network host -v "$PWD/read-only.json:/read-only.json" -e MC_HOST_local="$MC_HOST_local" quay.io/minio/mc anonymous set-json /read-only.json local/story-photos
docker run --rm --network host -e MC_HOST_local="$MC_HOST_local" quay.io/minio/mc admin accesskey create local
```

- **No `sh -c`.** The image's entrypoint is `mc` itself, so `docker run …
  quay.io/minio/mc sh -c "…"` fails with "`sh` is not a recognized command".
  The connection goes in the `MC_HOST_<alias>` environment variable instead of
  `mc alias set`, one `docker run` per command. A root password containing
  `@ : / #` must be URL-encoded inside that URL.
- **`--network host` and `127.0.0.1`.** The container then shares the Pi's
  network, so MinIO is just `127.0.0.1:9002` — no LAN IP to look up. Not
  `localhost`: it can resolve to IPv6 `::1`, where Docker may not have
  published the port ("connection refused").
- `mc anonymous get-json local/story-photos` (same `docker run` prefix) shows
  the policy that's actually in effect.

(Bucket itself was still created via the console: **Create Bucket** →
`story-photos`.) The last command prints an auto-generated Access Key +
Secret Key — those went into `backend/.env`, not the root credentials.

## 3. SWAG proxy-conf

`/config/nginx/proxy-confs/cdn.subdomain.conf`:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name cdn.*;

    include /config/nginx/ssl.conf;

    client_max_body_size 20M;

    location / {
        include /config/nginx/proxy.conf;
        # include /config/nginx/resolver.conf;
        set $upstream_app <lan-ip>;      # same pattern as the other proxy-confs on this SWAG instance
        set $upstream_port 9002;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;
    }
}
```

This SWAG instance's other confs all route by LAN IP with the Docker-DNS
resolver line commented out (rather than by container name), so this conf
follows the same pattern instead of relying on a shared Docker network.
Restart SWAG after saving.

## 4. DNS

`cdn.ankerd.org` — proxied (orange cloud) through Cloudflare, added to DDNS
same as the other subdomains.

## Verifying it's working

`GET /` on the S3 API (i.e. just visiting the bare domain) correctly returns
`403 AccessDenied` even when everything is fine — that's MinIO's normal
response to an unauthenticated ListBuckets call, not a failure. The real
test is fetching an actual object: `cdn.ankerd.org/story-photos/<path>`
should return the file directly with no auth needed (confirmed via the
read-only policy from step 2).

Listing the bucket must be refused:
`curl -s -o /dev/null -w "%{http_code}" "https://cdn.ankerd.org/story-photos/?list-type=2"`
should print `403`. A `200` means the bucket still has the canned
"download" policy and anyone can list every photo; apply `read-only.json`
from step 2.

## Current `backend/.env` values

```
MINIO_ENDPOINT=cdn.ankerd.org
MINIO_BUCKET=story-photos
MINIO_SECURE=true
# MINIO_ACCESS_KEY / MINIO_SECRET_KEY — already set, not reproduced here
```
