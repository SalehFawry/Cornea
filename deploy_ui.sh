#!/usr/bin/env bash
# =============================================================================
# Cornea — Dashboard UI Deployment Script
#
# Usage:
#   chmod +x deploy_ui.sh
#   VITE_API_KEY="your_secret" ./deploy_ui.sh
# =============================================================================
set -euo pipefail

LEGACY_CONTAINER="khaled_dev_container"
OLD_FRONTEND_CONTAINER="fawry_cv_app_container"
UI_CONTAINER="fawry_dashboard_ui"
UI_IMAGE="fawry-dashboard"
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/Dashboard/frontend"
VITE_API_KEY="${VITE_API_KEY:-}"

log() { echo "[deploy_ui] $*"; }
die() { echo "[deploy_ui] ERROR: $*" >&2; exit 1; }

# ── 1. Remove the legacy container ──────────────────────────────────────────
log "Removing legacy container: ${LEGACY_CONTAINER}"
docker stop "${LEGACY_CONTAINER}" 2>/dev/null || true
docker rm   "${LEGACY_CONTAINER}" 2>/dev/null || true

# ── 2. Remove the previous frontend container (holds port 3063) ─────────────
log "Removing previous frontend container: ${OLD_FRONTEND_CONTAINER}"
docker stop "${OLD_FRONTEND_CONTAINER}" 2>/dev/null || true
docker rm   "${OLD_FRONTEND_CONTAINER}" 2>/dev/null || true

# ── 3. Remove any existing dashboard UI container ───────────────────────────
log "Removing existing UI container: ${UI_CONTAINER}"
docker stop "${UI_CONTAINER}" 2>/dev/null || true
docker rm   "${UI_CONTAINER}" 2>/dev/null || true

# ── 3. Build the Docker image ───────────────────────────────────────────────
log "Building image ${UI_IMAGE}:latest from ${FRONTEND_DIR} ..."
docker build \
  --no-cache \
  --build-arg "VITE_API_KEY=${VITE_API_KEY}" \
  -t "${UI_IMAGE}:latest" \
  "${FRONTEND_DIR}"
log "Image built."

# ── 4. Run the new container ────────────────────────────────────────────────
log "Starting ${UI_CONTAINER} on port 3063 ..."
docker run -d \
  --name "${UI_CONTAINER}" \
  --restart unless-stopped \
  -p 3063:3063 \
  "${UI_IMAGE}:latest"
log "Container started."

# ── 5. Quick health check ──────────────────────────────────────────────────
log "Waiting 4 s for Nginx inside the container to come up ..."
sleep 4

HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:3063/ 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
  log "Health check passed (HTTP ${HTTP_CODE})."
else
  die "Health check failed (HTTP ${HTTP_CODE}). Run: docker logs ${UI_CONTAINER}"
fi

log "──────────────────────────────────────────────────────────"
log "Dashboard UI deployed successfully!"
log "  Container : ${UI_CONTAINER}"
log "  Local     : http://127.0.0.1:3063"
log "  Public    : https://ngnx-fawryplus.fawrypayments.com:9110"
log "──────────────────────────────────────────────────────────"
