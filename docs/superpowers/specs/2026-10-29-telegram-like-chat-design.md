# Telegram-like chat upgrade (text-first)

Date: 2026-10-29  
Status: design locked (self-reviewed)

## Goal

Make LoveApp couple chat feel closer to Telegram for day-to-day texting: better composer, replies/quotes, edits, presence, typing, reactions, pin, search — without media, delete, or forward.

## Out of scope (explicit)

- Photo / voice / files in chat
- Delete message (for me / for everyone)
- Forward / share-to-other-chats
- WebSocket transport
- Channels, groups, bots, stories
- Link previews, polls
- Multi-instance typing store (single `loveapp.service` Node process only)

## Current baseline

- `chat-client.tsx` + `GET/POST /api/messages` + SSE poll every 1.5s
- `Message`: `body`, `readAt`, `createdAt` only
- Stickers = short emoji bodies; ✓✓ reads; partner push on send
- Chat page does **not** pass partner into client today — only own `/api/profile`
- Partner roster already available via `GET /api/couple` (members + user fields)

## Approach

**Extend SSE + Prisma** (no new realtime stack). Presence/typing ride the same stream. Auth: `requireCoupleApi` everywhere chat-mutating.

---

## Data model

### `Message` (extend)

| Field | Type | Notes |
|-------|------|--------|
| `editedAt` | `DateTime?` | Set on successful edit |
| `replyToId` | `String?` | FK → `Message.id`, `onDelete: SetNull` |
| `quoteText` | `String?` | Highlighted snippet when replying; max **500** chars; **only allowed with `replyToId`** |

Self-relation: `replyTo` / `replies`. No soft-delete column.

### `MessageReaction` (new)

- `id`, `messageId`, `userId`, `emoji`, `createdAt`
- **One reaction per user per message** (Telegram-like): `@@unique([messageId, userId])`
- Toggle same emoji → delete; different allowlisted emoji → update row
- Allowlist in `src/lib/constants.ts` (e.g. `CHAT_REACTIONS`)

### `Couple` (extend)

- `pinnedMessageId String?` — at most one pin for the couple
- Relation to `Message` optional; **do not** cascade-delete Couple if message gone
- No message DELETE in product → pin target stays unless explicitly cleared
- If pinned message missing at read time → treat as unpinned and clear field opportunistically

### `User` (extend)

- `lastSeenAt DateTime?` — presence heartbeat

### Search

- No FTS in v1
- **Postgres (prod):** `contains` + `mode: 'insensitive'`
- **SQLite (local):** `contains` without insensitive mode (acceptable for dev) OR filter in memory on last N — document in plan; prod path is Postgres

### Demo store

- Extend `demo-store` / `demo-prisma` for new Message fields, `messageReaction` collection, `User.lastSeenAt`, `Couple.pinnedMessageId`

---

## API

### Message DTO (shared GET / POST response / SSE)

Every message payload includes:

- existing fields + `editedAt`, `replyToId`, `quoteText`
- `replyTo: { id, body, authorId, author: { displayName } } | null` (body truncated ~120 for preview OK)
- `reactions: { emoji, count, me: boolean }[]` aggregated for current user

### Messages

| Method | Path | Body / query | Behavior |
|--------|------|--------------|----------|
| GET | `/api/messages` | `?after=` optional | History as today (asc, take 200 / 100). **Marks partner msgs read** (unchanged). Includes DTO above + `pinnedMessageId` from couple in JSON root: `{ messages, pinnedMessageId }` |
| GET | `/api/messages/search` | `?q=` required, min 1 | Search only. **Must NOT mark messages read.** Limit 50, `createdAt desc`. Same DTO without forcing full thread |
| POST | `/api/messages` | `{ body, replyToId?, quoteText? }` | `quoteText` rejected if no `replyToId`. `replyTo` must same `coupleId`. Push unchanged |
| PATCH | `/api/messages/[id]` | `{ body }` | Author only; set `editedAt`; trim; 1–4000 chars |

No DELETE. **`?around=` dropped for v1** — jump only works if message already in loaded window (200); search result opens by id scroll if present, else show “сообщение вне истории” / refetch full GET once.

### Reactions

- `POST /api/messages/[id]/reactions` `{ emoji }` — allowlist; toggle / replace per unique `(messageId, userId)`

### Pin

- `POST /api/chat/pin` `{ messageId: string | null }` — either partner; message must belong to couple

### Presence

- `POST /api/chat/presence` — `user.lastSeenAt = now()`
- Client: while **chat page** mounted and `document.visibilityState === 'visible'`, every **25s** + on mount
- Not required from whole app shell in v1 (online ≈ “partner recently in chat”)

### Typing

- `POST /api/chat/typing` — in-memory `Map<coupleId, { userId, at }>` TTL **3s**
- Clear own entry on successful send / edit submit
- Single Node process assumption

### Partner for header

- Prefer pass partner from `chat/page.tsx` via `requireCouple()` props into `ChatClient`, **or** one `GET /api/couple` on mount
- Include `lastSeenAt` + `genderRole` of partner for «был» / «была»

### SSE `/api/messages/stream`

Interval **1.5s**. Emit:

| `type` | When | Payload |
|--------|------|---------|
| `connected` | start | — |
| `messages` | `createdAt > cursor` | full DTOs (with replyTo + reactions) |
| `message_updated` | `editedAt > editCursor` (and `editedAt != null`) | full DTOs to merge by id |
| `reads` | as today | `{ id, readAt }[]` |
| `reaction` | reaction row `createdAt` changed OR replace detected via polling recent reactions by `createdAt` / upsert time | `{ messageId, reactions }` |
| `pin` | couple `pinnedMessageId` changed vs last snapshot | `{ messageId: string \| null }` |
| `presence` | partner `lastSeenAt` changed | `{ userId, lastSeenAt }` |
| `typing` | partner typing map fresh | `{ userId, active: boolean }` |
| `ping` | idle tick | — |

**Client merge rules:** append new ids for `messages`; replace by id for `message_updated`; patch reactions by `messageId`; never duplicate.

**Reaction cursor (concrete):** each tick `findMany` reactions where `createdAt > lastReactionAt` OR messageIds touched; for each distinct `messageId`, re-aggregate and emit `reaction`. Also bump when toggle deletes (delete has no new createdAt) → on toggle API, set a `Message.reactionBumpAt DateTime?` **or** simpler: store `updatedAt` on `MessageReaction` with `@updatedAt` and query `updatedAt > cursor`. **Chosen:** add `@updatedAt` on `MessageReaction` and cursor on `updatedAt`.

---

## UI / UX

Preserve wallpaper, bubble grouping, sticker tray, own profile sheet.

### Header (new)

- Partner avatar + displayName
- Subtitle: «в сети» if `now - lastSeenAt < 45s`; else relative last seen using partner `genderRole` (**был** / **была**)
- While typing: subtitle → «печатает…»
- Search control opens search UI
- Move **profile** control into header (declutter composer); sheet behavior unchanged

### Pin bar

- Under header when `pinnedMessageId` set; tap → scroll + highlight; ✕ → pin null

### Message actions

Long-press / context menu:

- Ответить  
- Цитировать — only if there is a non-empty text selection inside that bubble; otherwise same as Ответить  
- Изменить (own)  
- Реакция (allowlist strip)  
- Закрепить / Открепить  
- Копировать  

No delete / forward.

### Reply / quote / edit / composer

- Reply chip on bubble; composer reply bar with cancel
- Stickers **keep** active reply (Telegram-like)
- Edit mode in composer → PATCH; show «изменено»
- Auto-grow textarea; Enter send / Shift+Enter newline on desktop; send button always on mobile
- Typing POST debounced ~1s while text non-empty

### Reactions

- Under bubble: emoji + count; tap own to toggle off

### Search UI

- Overlay/panel; calls `/api/messages/search`; tap result scrolls if message in list, else brief note

---

## Layout / CSS risk

- Chat is `flex` column with bottom nav from app shell — header + pin bar must not break `100dvh` math in `.chat-page`
- Touch long-press must not fight scroll (threshold ~400ms / movement cancel)

---

## Push

- Only on **new** `POST /api/messages` (unchanged)
- No push on edit / reaction / typing / pin

---

## Error handling

- 401/403 wrong couple / non-author edit  
- 404 missing message / reply target  
- 400 empty body, bad emoji, quote without reply, quote > 500, reply wrong couple  
- Client: inline muted error; revert optimistic send/edit/reaction/pin  
- Presence/typing: fire-and-forget  

---

## Testing

- Vitest: reply validation, edit auth, reaction toggle/replace, pin null, search does not require read side-effect (route unit if patterned)
- Manual: two sessions — presence, typing, SSE edit, reply jump, search

---

## Implementation order

1. Prisma + demo store (`Message` fields, `MessageReaction`+`updatedAt`, `User.lastSeenAt`, `Couple.pinnedMessageId`)
2. APIs: DTO helpers, POST/PATCH/GET messages, search route, reactions, pin, presence, typing
3. SSE extensions + client merge
4. UI: header/partner props → composer → reply/quote → edit → reactions → pin → search → long-press
5. CSS polish + mobile gesture pass

## Success criteria

- Partner sees edits/replies/reactions/pin without refresh (≤ ~2s)
- Header shows online / last seen (gendered) and typing
- Composer usable on phone
- Search does not mark messages read
- Reads, stickers, push still work; no delete/forward/media
