#!/usr/bin/env bash
#
# Production deploy, invoked over SSH by the GitHub Actions workflow.
#
# Installed to /usr/local/bin/deploy-hostello.sh and pinned as the forced
# command on the CI key in /root/.ssh/authorized_keys, so that key can run this
# and nothing else — a leaked CI secret cannot open a root shell.
#
# The build runs before the service restarts: if it fails, the script exits
# non-zero and the currently-running release is left untouched.
set -euo pipefail

APP_DIR=/var/www/hostello
SERVICE=hostello
HEALTH_URL=https://hostello.tech/

log() { echo "[deploy] $*"; }

cd "$APP_DIR"

PREVIOUS=$(git rev-parse HEAD)
log "current revision ${PREVIOUS}"

log "fetching origin/main"
git fetch --quiet origin main
git reset --hard --quiet origin/main
TARGET=$(git rev-parse HEAD)
log "target revision ${TARGET}"

if [ "$PREVIOUS" = "$TARGET" ]; then
  log "already at ${TARGET}, rebuilding anyway to pick up any dependency changes"
fi

log "installing dependencies"
npm ci --no-audit --no-fund

log "building"
NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build

log "fixing ownership"
chown -R hostello:hostello "$APP_DIR"

log "restarting ${SERVICE}"
systemctl restart "$SERVICE"

# Give the service a moment, then confirm it actually answers.
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  sleep 3
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" || echo 000)
  if [ "$code" = "200" ]; then
    log "health check passed (HTTP ${code}) on attempt ${attempt}"
    log "deployed ${TARGET}"
    exit 0
  fi
  log "health check attempt ${attempt}: HTTP ${code}"
done

log "ERROR: health check never returned 200 — rolling back to ${PREVIOUS}"
git reset --hard --quiet "$PREVIOUS"
npm ci --no-audit --no-fund
NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build
chown -R hostello:hostello "$APP_DIR"
systemctl restart "$SERVICE"
log "rolled back to ${PREVIOUS}"
exit 1
