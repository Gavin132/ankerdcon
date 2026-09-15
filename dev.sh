#!/usr/bin/env bash
# Runs the Ankerd Con backend and frontend together for local development
# (macOS / Linux / Git Bash). Windows PowerShell users: use dev.ps1.
#
#   ./dev.sh            start both
#   ./dev.sh --install  create .venv (Python 3.12) if needed, install or
#                       update all dependencies, then start both
#
# Backend: http://localhost:8000 · Frontend: http://localhost:5173 · Ctrl+C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

venv_python() {
  if [[ -x "$ROOT/.venv/bin/python" ]]; then echo "$ROOT/.venv/bin/python"
  elif [[ -x "$ROOT/.venv/Scripts/python.exe" ]]; then echo "$ROOT/.venv/Scripts/python.exe"
  fi
}

fail() { echo "$1" >&2; exit 1; }

# ── Install / update dependencies ─────────────────────────────────────────────
if [[ "${1:-}" == "--install" ]]; then
  if [[ -z "$(venv_python)" ]]; then
    echo "Creating .venv with Python 3.12..."
    if command -v python3.12 >/dev/null 2>&1; then python3.12 -m venv "$ROOT/.venv"
    elif command -v py >/dev/null 2>&1; then py -3.12 -m venv "$ROOT/.venv"
    else fail "Python 3.12 not found. Install it first (see docs/local-development.md)."
    fi
  fi
  echo "Installing backend dependencies..."
  "$(venv_python)" -m pip install --disable-pip-version-check -r "$ROOT/backend/requirements.txt"
  echo "Installing frontend dependencies..."
  (cd "$ROOT/frontend" && npm ci)
fi

# ── Preflight checks ──────────────────────────────────────────────────────────
PY="$(venv_python)"
[[ -n "$PY" ]] || fail "No .venv found. Run: ./dev.sh --install"
[[ -d "$ROOT/frontend/node_modules" ]] || fail "Frontend dependencies missing. Run: ./dev.sh --install"
[[ -f "$ROOT/backend/.env" ]] || fail "backend/.env is missing. Copy backend/.env.example to backend/.env and fill it in."
[[ -f "$ROOT/frontend/.env" ]] || fail "frontend/.env is missing. Copy frontend/.env.example to frontend/.env and fill it in."
if curl -s -o /dev/null --max-time 1 http://localhost:8000/; then
  fail "Port 8000 is already in use. Is the backend already running in another terminal?"
fi

# ── Backend ───────────────────────────────────────────────────────────────────
echo "Starting backend on http://localhost:8000 ..."
(cd "$ROOT/backend" && exec "$PY" -m uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!
trap 'echo "Stopping backend..."; kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 90); do
  kill -0 "$BACKEND_PID" 2>/dev/null || fail "The backend stopped while starting. See its output above."
  curl -s -o /dev/null --max-time 1 http://localhost:8000/ && break
  sleep 0.5
done
curl -s -o /dev/null --max-time 1 http://localhost:8000/ || fail "The backend didn't start on port 8000 within 45 seconds."

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "Starting frontend (Vite prints the URL below, normally http://localhost:5173). Ctrl+C stops both."
cd "$ROOT/frontend"
npm run dev
