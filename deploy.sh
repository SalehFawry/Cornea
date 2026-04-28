#!/usr/bin/env bash
# =============================================================================
# Cornea — Production Deployment Script
#
# Usage:
#   chmod +x deploy.sh
#   VITE_API_KEY="your_secret" ./deploy.sh
#
# What this script does:
#   1. Stops and removes the legacy container (khaled_dev_container).
#   2. Builds the FastAPI backend Docker image.
#   3. Builds the React frontend Docker image (Vite prod build baked in).
#   4. Starts both containers with the correct port mappings.
# =============================================================================
set -euo pipefail

# ── Configurable names ────────────────────────────────────────────────────────
OLD_FRONTEND_CONTAINER="khaled_dev_container"
BACKEND_CONTAINER="cornea_backend_container"
FRONTEND_CONTAINER="fawry_cv_app_container"

BACKEND_IMAGE="cornea_backend"
FRONTEND_IMAGE="cornea_frontend"

# Directory layout (relative to this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/Dashboard/frontend"

# Oracle connection (read from environment or use .env defaults)
DATABASE_URL="${DATABASE_URL:-oracle+oracledb_async://AIUSER:AIUSER@10.100.44.80:1525/?service_name=ORDB}"
API_KEY="${API_KEY:-}"
VITE_API_KEY="${VITE_API_KEY:-}"

log()  { echo "[deploy] $*"; }
die()  { echo "[deploy] ERROR: $*" >&2; exit 1; }

# ── 1. Tear down the old frontend container ───────────────────────────────────
log "Stopping legacy container: ${OLD_FRONTEND_CONTAINER}"
docker stop "${OLD_FRONTEND_CONTAINER}" 2>/dev/null || true
docker rm   "${OLD_FRONTEND_CONTAINER}" 2>/dev/null || true
log "Legacy container removed."

# ── 2. (Optional) tear down existing backend / frontend containers ────────────
log "Stopping existing Cornea containers (if any)..."
docker stop "${BACKEND_CONTAINER}"  2>/dev/null || true
docker rm   "${BACKEND_CONTAINER}"  2>/dev/null || true
docker stop "${FRONTEND_CONTAINER}" 2>/dev/null || true
docker rm   "${FRONTEND_CONTAINER}" 2>/dev/null || true

# ── 3. Build the FastAPI backend image ────────────────────────────────────────
log "Building backend image: ${BACKEND_IMAGE}..."
docker build \
  --no-cache \
  -t "${BACKEND_IMAGE}:latest" \
  "${BACKEND_DIR}"
log "Backend image built."

# ── 4. Build the React frontend image ─────────────────────────────────────────
# VITE_API_BASE_URL is read from .env.production inside the Dockerfile.
# VITE_API_KEY is a secret, so it's injected here at build time.
log "Building frontend image: ${FRONTEND_IMAGE}..."
docker build \
  --no-cache \
  --build-arg "VITE_API_KEY=${VITE_API_KEY}" \
  -t "${FRONTEND_IMAGE}:latest" \
  "${FRONTEND_DIR}"
log "Frontend image built."

# ── 5. Start the backend container ────────────────────────────────────────────
log "Starting backend container on port 8000..."
docker run -d \
  --name "${BACKEND_CONTAINER}" \
  --restart unless-stopped \
  -p 8000:8000 \
  -e "DATABASE_URL=${DATABASE_URL}" \
  -e "API_KEY=${API_KEY}" \
  -e "CORS_ORIGINS=https://ngnx-fawryplus.fawrypayments.com:9110" \
  "${BACKEND_IMAGE}:latest"
log "Backend container started: ${BACKEND_CONTAINER}"

# ── 6. Start the frontend container ───────────────────────────────────────────
log "Starting frontend container on port 3063..."
docker run -d \
  --name "${FRONTEND_CONTAINER}" \
  --restart unless-stopped \
  -p 3063:3063 \
  "${FRONTEND_IMAGE}:latest"
log "Frontend container started: ${FRONTEND_CONTAINER}"

# ── 7. Health check ───────────────────────────────────────────────────────────
log "Waiting 5 s for containers to initialise..."
sleep 5

log "Checking backend /health..."
curl -sf http://127.0.0.1:8000/health | python3 -m json.tool || \
  die "Backend health check failed — see: docker logs ${BACKEND_CONTAINER}"

log "Checking frontend (HTTP 200 on port 3063)..."
curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:3063/ | grep -q "200" || \
  die "Frontend health check failed — see: docker logs ${FRONTEND_CONTAINER}"

log "──────────────────────────────────────────────────────────"
log "Deployment complete!"
log "  Frontend : https://ngnx-fawryplus.fawrypayments.com:9110"
log "  Backend  : http://127.0.0.1:8000/api/v1/docs (internal)"
log "  Metrics  : http://127.0.0.1:8000/metrics      (internal)"
log "──────────────────────────────────────────────────────────"
