<#
.SYNOPSIS
  Runs the Ankerd Con backend and frontend together for local development.

.DESCRIPTION
  Starts the FastAPI backend (http://localhost:8000) from .venv, waits until
  it accepts connections, then starts the Vite frontend (http://localhost:5173)
  in this terminal. Ctrl+C stops both.

.PARAMETER Install
  Create .venv with Python 3.12 if it doesn't exist, then install or update
  the backend and frontend dependencies before starting.

.EXAMPLE
  .\dev.ps1
  .\dev.ps1 -Install
#>
param([switch]$Install)

$ErrorActionPreference = "Stop"
$root        = $PSScriptRoot
$backendDir  = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$venvPython  = Join-Path $root ".venv\Scripts\python.exe"

function Fail($message) {
  Write-Host $message -ForegroundColor Red
  exit 1
}

# ── Install / update dependencies ─────────────────────────────────────────────
if ($Install) {
  if (-not (Test-Path $venvPython)) {
    Write-Host "Creating .venv with Python 3.12..." -ForegroundColor Cyan
    py -3.12 -m venv (Join-Path $root ".venv")
    if ($LASTEXITCODE -ne 0) { Fail "Could not create .venv. Install Python 3.12 first: winget install Python.Python.3.12" }
  }

  Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
  & $venvPython -m pip install --disable-pip-version-check -r (Join-Path $backendDir "requirements.txt")
  if ($LASTEXITCODE -ne 0) { Fail "Installing backend dependencies failed (see above)." }

  Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
  Push-Location $frontendDir
  try { npm ci } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { Fail "Installing frontend dependencies failed (see above)." }
}

# ── Preflight checks ──────────────────────────────────────────────────────────
if (-not (Test-Path $venvPython))                          { Fail "No .venv found. Run: .\dev.ps1 -Install" }
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) { Fail "Frontend dependencies missing. Run: .\dev.ps1 -Install" }
if (-not (Test-Path (Join-Path $backendDir ".env")))      { Fail "backend\.env is missing. Copy backend\.env.example to backend\.env and fill it in." }
if (-not (Test-Path (Join-Path $frontendDir ".env")))     { Fail "frontend\.env is missing. Copy frontend\.env.example to frontend\.env and fill it in." }
if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
  Fail "Port 8000 is already in use. Is the backend already running in another terminal?"
}

# ── Backend ───────────────────────────────────────────────────────────────────
Write-Host "Starting backend on http://localhost:8000 ..." -ForegroundColor Cyan
$backend = Start-Process -FilePath $venvPython `
  -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--port", "8000" `
  -WorkingDirectory $backendDir -NoNewWindow -PassThru

try {
  $deadline = (Get-Date).AddSeconds(45)
  do {
    Start-Sleep -Milliseconds 500
    if ($backend.HasExited) { Fail "The backend stopped while starting. See its output above." }
    $listening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
  } until ($listening -or (Get-Date) -gt $deadline)
  if (-not $listening) { Fail "The backend didn't start listening on port 8000 within 45 seconds." }

  # ── Frontend ────────────────────────────────────────────────────────────────
  Write-Host "Starting frontend (Vite prints the URL below, normally http://localhost:5173). Ctrl+C stops both." -ForegroundColor Cyan
  Push-Location $frontendDir
  try { npm run dev } finally { Pop-Location }
}
finally {
  if (-not $backend.HasExited) {
    Write-Host "Stopping backend..." -ForegroundColor Cyan
    # /T also stops the worker process uvicorn's --reload spawns.
    taskkill /PID $backend.Id /T /F | Out-Null
  }
}
