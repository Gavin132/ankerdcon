# Setting up MinIO for event-day photo stories

**Status: done.** This is the actual working setup for this instance
(`cdn.ankerd.org`), kept here in case it's ever redeployed. It differs from a
generic MinIO+SWAG guide in a couple of specific ways that turned out to
matter for this Portainer/SWAG setup — see the notes below each step.

## 1. Deploy MinIO as a Portainer stack

```yaml
services:
  minio:
    image: minio/minio:latest
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
- No `networks:` section needed — this SWAG setup reaches other services by
  **LAN IP**, not Docker container name (see step 2), so MinIO doesn't need to
  share a Docker network with SWAG at all.
- Root user/password is the full-admin login, not the app's access key
  (that's step 3).

## 2. Bucket policy + access key — via the `mc` CLI, not the console

Recent MinIO's free "Community Edition" console dropped the GUI for both
anonymous-access policies and access-key management, so this goes through
`mc` in a throwaway container instead:

```bash
docker run --rm minio/mc sh -c "mc alias set local http://<lan-ip>:9002 <root_user> <root_password> && mc anonymous set download local/story-photos && mc admin accesskey create local"
```

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
anonymous-download policy from step 2).

## Current `backend/.env` values

```
MINIO_ENDPOINT=cdn.ankerd.org
MINIO_BUCKET=story-photos
MINIO_SECURE=true
# MINIO_ACCESS_KEY / MINIO_SECRET_KEY — already set, not reproduced here
```
