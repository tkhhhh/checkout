#!/usr/bin/env bash
# One-time server bootstrap for CentOS Stream 8/9 (also RHEL 8+, Rocky, Alma).
# Idempotent — safe to re-run. If docker is already installed it's left alone.
#
#   sudo bash bootstrap-centos.sh <deploy-user> <deploy-path>
#
# Ensures:
#   - docker-ce + compose plugin are installed
#   - docker service is enabled and running
#   - $DEPLOY_USER is in the docker group
#   - firewalld (if running) permits 80/tcp
#   - $DEPLOY_PATH exists and is owned by $DEPLOY_USER

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "run as root (e.g. sudo bash $0 <user> <path>)" >&2
  exit 1
fi

DEPLOY_USER="${1:?usage: $0 <deploy-user> <deploy-path>}"
DEPLOY_PATH="${2:?usage: $0 <deploy-user> <deploy-path>}"

if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "user '$DEPLOY_USER' does not exist — create it first (adduser $DEPLOY_USER)" >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  echo "==> docker already installed ($(docker --version))"
else
  echo "==> installing docker-ce"
  dnf -y install dnf-plugins-core
  dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "==> ensuring docker service is enabled and running"
systemctl enable --now docker

if docker compose version >/dev/null 2>&1; then
  echo "==> compose plugin present ($(docker compose version --short))"
else
  echo "==> installing docker compose plugin"
  dnf -y install docker-compose-plugin
fi

if id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -qx docker; then
  echo "==> '$DEPLOY_USER' already in docker group"
else
  echo "==> adding '$DEPLOY_USER' to docker group (will take effect on next login)"
  usermod -aG docker "$DEPLOY_USER"
fi

if systemctl is-active --quiet firewalld; then
  if firewall-cmd --list-ports | tr ' ' '\n' | grep -qx '80/tcp'; then
    echo "==> firewalld already permits 80/tcp"
  else
    echo "==> opening firewalld port 80/tcp"
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --reload
  fi
else
  echo "==> firewalld not running — skipping (make sure 80/tcp is reachable)"
fi

if [ ! -d "$DEPLOY_PATH" ]; then
  echo "==> creating $DEPLOY_PATH"
  install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 750 -d "$DEPLOY_PATH"
else
  echo "==> $DEPLOY_PATH already exists"
fi

echo
echo "Done. Next:"
echo "  1. Append the deploy key's PUBLIC half to"
echo "       /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "     (~/.ssh needs mode 700, authorized_keys mode 600, both owned by $DEPLOY_USER)"
echo "  2. In GitHub → Settings → Environments → production, set:"
echo "       DEPLOY_SSH_HOST=<this server's hostname or IP>"
echo "       DEPLOY_SSH_USER=$DEPLOY_USER"
echo "       DEPLOY_SSH_KEY=<paste the private key>"
echo "       DEPLOY_PATH=$DEPLOY_PATH"
echo "       POSTGRES_PASSWORD=<pick one>"
echo "       JWT_SECRET=<pick one>"
echo "  3. Push to main or run the workflow manually (Actions → deploy → Run workflow)."
