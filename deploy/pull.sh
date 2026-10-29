#!/usr/bin/env bash
# Deploy LoveApp on VPS from GitHub (no scp/tar).
# Usage:
#   bash /opt/loveApp/deploy/pull.sh
#   DEPLOY_BRANCH=feature/telegram-like-chat bash /opt/loveApp/deploy/pull.sh
#
# Requires: /opt/loveApp is a git checkout, .env and deploy/.env already filled (never from git).
set -eu

APP_DIR="${APP_DIR:-/opt/loveApp}"
REMOTE="${DEPLOY_REMOTE:-origin}"
# Prefer explicit DEPLOY_BRANCH; else keep the branch already checked out
# (so `git clone -b feature/...` + bare `bash pull.sh` does not jump to main).
if [ -n "${DEPLOY_BRANCH:-}" ]; then
  BRANCH="$DEPLOY_BRANCH"
else
  BRANCH="$(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
  if [ "$BRANCH" = "HEAD" ]; then
    BRANCH="main"
  fi
fi
echo "==> deploy branch: $BRANCH"

cd "$APP_DIR"

if [ ! -d .git ]; then
  echo "ERROR: $APP_DIR is not a git repo."
  echo "One-time: convert from tar install — see deploy/README.md § Git deploy"
  exit 1
fi

if [ ! -f .env ]; then
  echo "ERROR: missing $APP_DIR/.env (keep secrets on the server, not in git)"
  exit 1
fi

# Save secrets that must survive reset (git clean would not touch ignored .env,
# but we still backup in case of mistakes).
cp -a .env /root/loveapp.env.bak
if [ -f deploy/.env ]; then
  cp -a deploy/.env /root/loveapp.deploy.env.bak
fi

echo "==> fetch $REMOTE $BRANCH"
git fetch "$REMOTE" "$BRANCH"
# Drop local edits to tracked files so checkout cannot fail (.env is gitignored — kept)
git reset --hard HEAD
git checkout -B "$BRANCH" "$REMOTE/$BRANCH"
git reset --hard "$REMOTE/$BRANCH"

# Restore env if somehow missing after checkout
if [ ! -f .env ] && [ -f /root/loveapp.env.bak ]; then
  cp -a /root/loveapp.env.bak .env
fi
if [ ! -f deploy/.env ] && [ -f /root/loveapp.deploy.env.bak ]; then
  cp -a /root/loveapp.deploy.env.bak deploy/.env
fi

# Repo defaults to sqlite for local; production uses Postgres
if grep -q 'provider = "sqlite"' prisma/schema.prisma; then
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  echo "prisma schema -> postgresql"
fi

echo "==> npm ci"
npm ci

echo "==> prisma db push"
npx prisma db push

echo "==> build:prod"
npm run build:prod

if [ -f deploy/loveapp.service ]; then
  cp -f deploy/loveapp.service /etc/systemd/system/loveapp.service
  systemctl daemon-reload
fi

systemctl restart loveapp
systemctl --no-pager --full is-active loveapp || true

echo "==> done. HTTP:"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/ || true
