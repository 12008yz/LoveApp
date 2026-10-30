# Album Instagram-style feed + comments

Date: 2026-10-30  
Status: design locked (implementing)

## Goal

Replace the crooked album feed with an Instagram-like vertical feed (4:5 cover photos) and add per-photo comments for the couple.

## Locked decisions

- Layout: Instagram feed (not grid/lightbox)
- Photo frame: **4:5**, `object-fit: cover`, full width
- Comments: yes; reactions: **later** (out of scope)
- Live/SSE: **no** — refresh on load + after own comment
- Delete: own comments only; no photo delete / no comment edit
- Approach: `MediaComment` model + REST

## Data

### `MediaComment` (new)

| Field | Type | Notes |
|-------|------|--------|
| id | String cuid | |
| mediaItemId | String | FK → MediaItem, Cascade |
| authorId | String | FK → User, Cascade |
| body | String | trim, 1–500 |
| createdAt | DateTime | |

Index: `@@index([mediaItemId, createdAt])`

### Relations

- `MediaItem.comments MediaComment[]`
- `User.mediaComments MediaComment[]`

## API

### `GET /api/media`

Returns `{ items }` where each item includes existing fields +:

- `comments`: up to 50, `createdAt asc`, with `author: { id, displayName }`
- `commentCount`: `comments.length` (enough for couple; if >50 later paginate)

### `POST /api/media`

Unchanged (file + caption required).

### `POST /api/media/[id]/comments`

Body `{ body }`. Couple member only. Media must belong to couple. Returns `{ comment }`.

### `DELETE /api/media/[id]/comments/[commentId]`

Author only + media belongs to couple. Returns `{ ok: true }`.

## UI

- Compact upload at top (file → 4:5 preview → caption → submit)
- Feed posts: author + time, 4:5 image, caption
- Comments collapsed: last comment + «Посмотреть все (N)»; expand in place
- Composer always under post; delete control on own comments
- Pass `meId` from page via `requireCouple()`

## Out of scope

- Reactions, SSE, photo delete, comment edit, places UI in album

## Demo

- `mediaComment` collection in demo-store / demo-prisma includes
