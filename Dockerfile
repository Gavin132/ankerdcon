# One image with everything: the React frontend is built in a first stage and
# copied into the FastAPI backend, which then serves both the API and the app.
# Build from the repository root:
#   docker build -t ankerdcon \
#     --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... .
# See docs/installation.md. (backend/Dockerfile is the backend-only image, for
# setups that build the frontend separately.)

# ── Stage 1: build the frontend ──────────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /build

# vite.config.ts reads the app version from ../backend/VERSION and writes the
# build to ../backend/dist, so the folder layout is kept.
COPY backend/VERSION backend/VERSION
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci
COPY frontend frontend

# These two are baked into the bundle, so changing them means rebuilding the
# image. Both are public by design (the publishable key is not a secret).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
# "dev" builds the orange beta icon and title; leave empty for the live app.
ARG APP_ENV=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    APP_ENV=$APP_ENV
RUN cd frontend && npm run build

# ── Stage 2: the backend, with the built frontend inside ─────────────────────
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# .dockerignore keeps .env (and every other secret) out of the image;
# configuration comes from the container's environment at runtime.
COPY backend/ .
COPY --from=frontend /build/backend/dist ./dist

# Run as an unprivileged user, not root.
RUN useradd --system --no-create-home app && chown -R app /app
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
