#!/usr/bin/env bash
# Run on VPS after app code is in /opt/loveApp (and deploy/ already has Docker up).
set -eu

APP_DIR="${APP_DIR:-/opt/loveApp}"
cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "Missing $APP_DIR/.env — copy from deploy/env.app.example and fill secrets."
  exit 1
fi

# Prisma: switch to Postgres for this host (local repo stays sqlite)
if grep -q 'provider = "sqlite"' prisma/schema.prisma; then
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  echo "prisma schema -> postgresql"
fi

npm ci
npx prisma db push
npm run build:prod

cp -f deploy/loveapp.service /etc/systemd/system/loveapp.service
systemctl daemon-reload
systemctl enable --now loveapp
systemctl --no-pager --full status loveapp || true

echo "Check: curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/"