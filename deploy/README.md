# LoveApp infra on VPS (Postgres + MinIO-compatible Silo)

Step 1 only: Docker Compose. Nginx / Next.js — later.

> Official `minio/minio` / `minio/mc` images were removed from Docker Hub (2026).
> This stack uses `pgsty/silo` (S3 API + `MINIO_*` env) and `amazon/aws-cli` for bucket init.

## Install Docker (Ubuntu)

```bash
apt update
apt install -y docker.io docker-compose-v2 || apt install -y docker.io docker-compose
systemctl enable --now docker
docker --version
docker compose version || docker-compose --version
```

## Start

```bash
mkdir -p /opt/loveApp/deploy
# copy docker-compose.yml + .env.example into /opt/loveApp/deploy
cd /opt/loveApp/deploy
cp .env.example .env
nano .env   # replace CHANGE_ME_* (MinIO password ≥ 8 chars)
docker compose up -d
docker compose ps
```

Volumes will be named `loveapp_love_pg` and `loveapp_love_minio` (project `name: loveapp`).

## Checks

```bash
cd /opt/loveApp/deploy
set -a && . ./.env && set +a

docker compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9000/minio/health/live
docker compose logs minio-init --tail 20
```

Expect: Postgres `accepting connections`, MinIO HTTP `200`, minio-init создал бакет без ошибки.

## Ports (localhost only)

| Service  | Bind              |
|----------|-------------------|
| Postgres | 127.0.0.1:5432    |
| MinIO API| 127.0.0.1:9000    |
| MinIO UI | 127.0.0.1:9001    |

Do not open these in the firewall. pyBot on `:8088` is unrelated and stays as is.

## Step 2 — App code + Node + systemd

### Git deploy (preferred)

From your PC: commit + `git push origin <branch>`.  
On VPS: `bash /opt/loveApp/deploy/pull.sh` (optional `DEPLOY_BRANCH=...`).

`.env` and `deploy/.env` stay **only on the server** (not in git).

#### One-time: turn current `/opt/loveApp` (tar) into a git checkout

```bash
# backup secrets + running tree
cp -a /opt/loveApp/.env /root/loveapp.env.bak
cp -a /opt/loveApp/deploy/.env /root/loveapp.deploy.env.bak 2>/dev/null || true
systemctl stop loveapp || true

mv /opt/loveApp /opt/loveApp.tar-backup
git clone https://github.com/12008yz/LoveApp.git /opt/loveApp
# private repo? use SSH remote or a deploy token URL instead

cp -a /root/loveapp.env.bak /opt/loveApp/.env
mkdir -p /opt/loveApp/deploy
cp -a /root/loveapp.deploy.env.bak /opt/loveApp/deploy/.env 2>/dev/null || true

# keep Docker volumes; only app code moved
cd /opt/loveApp
# deploy chat branch until it is merged to main:
#   DEPLOY_BRANCH=feature/telegram-like-chat bash deploy/pull.sh
bash deploy/pull.sh
```

If the GitHub repo is **private**, on the VPS once:

```bash
# option A — SSH key for git
ssh-keygen -t ed25519 -N "" -f /root/.ssh/loveapp_deploy
# add /root/.ssh/loveapp_deploy.pub as Deploy key (read-only) on the GitHub repo
git -C /opt/loveApp remote set-url origin git@github.com:12008yz/LoveApp.git

# option B — HTTPS with fine-grained PAT (not committed anywhere)
# git remote set-url origin https://USER:TOKEN@github.com/12008yz/LoveApp.git
```

#### Everyday update

```powershell
# PC
cd c:\progect\loveApp
git add -A
git commit -m "your message"
git push origin main
# or: git push origin feature/telegram-like-chat
```

```bash
# VPS
DEPLOY_BRANCH=main bash /opt/loveApp/deploy/pull.sh
# or until merge:
# DEPLOY_BRANCH=feature/telegram-like-chat bash /opt/loveApp/deploy/pull.sh
```

One-liner from PC (after push):

```powershell
ssh root@95.163.231.19 "DEPLOY_BRANCH=main bash /opt/loveApp/deploy/pull.sh"
```

### Legacy (tar + scp) — avoid

1. Install Node 22 on VPS, upload app sources via archive.
2. Create `/opt/loveApp/.env` from `deploy/env.app.example` (use passwords from `deploy/.env`).
3. `bash deploy/setup-app.sh`
4. `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/`

Nginx cutover is step 3.
