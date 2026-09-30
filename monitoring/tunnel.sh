#!/usr/bin/env bash
# SSH tunnel: EC2 node_exporter (and optional extras) → localhost for local Prometheus.
# Uses the project PEM. Does NOT open Grafana on AWS.
#
# Usage (Git Bash):
#   cd monitoring
#   cp .env.example .env   # edit SSH_HOST / SSH_USER if needed
#   ./tunnel.sh
#
# Leave this running in a terminal while Docker Compose scrapes host.docker.internal:9100.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
if [[ -f "$(dirname "$0")/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$(dirname "$0")/.env"
  set +a
fi

PEM="${SSH_PEM:-$ROOT/snapstock-k3s-key.pem}"
HOST="${SSH_HOST:-15.252.170.236}"
USER="${SSH_USER:-ubuntu}"
LOCAL_NODE_PORT="${LOCAL_NODE_PORT:-9100}"
REMOTE_NODE_PORT="${REMOTE_NODE_PORT:-9100}"

if [[ ! -f "$PEM" ]]; then
  echo "PEM not found: $PEM"
  echo "Place snapstock-k3s-key.pem at the repo root (gitignored) or set SSH_PEM."
  exit 1
fi

chmod 400 "$PEM" 2>/dev/null || true

echo "Tunneling ${USER}@${HOST} remote :${REMOTE_NODE_PORT} → local :${LOCAL_NODE_PORT}"
echo "Keep this process running. Ctrl+C to stop."
echo "Prometheus job ec2-node-via-tunnel scrapes host.docker.internal:${LOCAL_NODE_PORT}"

exec ssh -i "$PEM" -N \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o StrictHostKeyChecking=accept-new \
  -L "${LOCAL_NODE_PORT}:127.0.0.1:${REMOTE_NODE_PORT}" \
  "${USER}@${HOST}"
