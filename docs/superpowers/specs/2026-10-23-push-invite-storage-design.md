# Push, invite link, reminders, Postgres/S3

## Scope

1. Web Push for chat + calendar reminders (VAPID)
2. Invite URL `/join/[code]`
3. Event `remindAt` / `remindedAt` + cron
4. PostgreSQL + MinIO (S3) with local upload fallback

## Notes

- Cron: `/api/cron/reminders` + Node interval via `instrumentation.ts`
- Storage: S3 when `S3_*` set, else `public/uploads`
