# LoveApp

Веб-приложение для пар (мальчик + девочка): общий домик с чатом, дневником, пингами, календарём, письмами, альбомом, картой, timeline, играми, wishlist, списками заботы и mood check-in.

## Стек

- Next.js (App Router) + TypeScript
- Prisma: **SQLite локально**, **PostgreSQL** через Docker для продакшена
- Auth.js (credentials)
- SSE для near-realtime чата
- **Web Push** (VAPID) — сообщения и напоминания календаря
- Фото: локально `public/uploads` или **MinIO/S3** (если заданы `S3_*`)
- PWA (manifest + service worker)

## Тесты

```bash
npm test
```

Покрыты: логика игр, инвайт-коды, маскировка писем, cron-auth, режим storage, изоляция пар в БД.

## Быстрый старт (без Docker)

```bash
cp .env.example .env
# ключи VAPID уже можно сгенерировать: npx web-push generate-vapid-keys
npm install
npx prisma db push
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Docker: Postgres + MinIO

1. Запустите Docker Desktop
2. В `prisma/schema.prisma` поставьте `provider = "postgresql"`
3. В `.env` укажите `DATABASE_URL` и блок `S3_*` из `.env.example`
4. `npm run docker:up` затем `npx prisma db push`

- Postgres: `localhost:5432` (love / love / loveapp)
- MinIO: API `9000`, консоль `9001` (minioadmin / minioadmin)

## Сценарий

1. Регистрация → создать пару → **скопировать ссылку** `/join/КОД`
2. Партнёр открывает ссылку → регистрация/вход → роль → пара активна
3. На главной: **Включить уведомления**
4. Календарь: поле «Напомнить» → push около этого времени (проверка раз в минуту)

## Переменные

См. `.env.example`.
