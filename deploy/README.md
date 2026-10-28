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
