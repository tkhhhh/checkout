#!/usr/bin/env bash
# Runs on the target server. Invoked by the GitHub Actions deploy job with:
#   echo "<ghcr_token>" | ssh <host> "cd <path> && GHCR_USER=<user> bash remote-deploy.sh"
#
# Reads a single-line GHCR token from stdin (so the value never appears in
# `ps` on the server). Assumes docker-compose.yml and .env are already in cwd.

set -euo pipefail

if [ ! -f docker-compose.yml ]; then
  echo "error: docker-compose.yml not found in $(pwd)" >&2
  exit 1
fi
if [ ! -f .env ]; then
  echo "error: .env not found in $(pwd)" >&2
  exit 1
fi

if [ ! -t 0 ]; then
  read -r GHCR_TOKEN || true
  if [ -n "${GHCR_TOKEN:-}" ]; then
    : "${GHCR_USER:?GHCR_USER must be set when a token is provided}"
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
  fi
fi

docker compose pull
docker compose down -v --remove-orphans
docker compose up -d --remove-orphans
docker image prune -f
