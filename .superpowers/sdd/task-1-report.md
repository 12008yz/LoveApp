# Task 1 Report: Schema + constants + pure helpers

Status: DONE (no commits made, per instruction)

## TDD evidence

### RED
Command: `npx vitest run src/lib/chat-presence.test.ts src/lib/chat-typing.test.ts src/lib/chat-messages.test.ts`
Result (before any implementation; full output in `.superpowers/sdd/task-1-red.txt`):
```
FAIL src/lib/chat-presence.test.ts - Cannot find module '@/lib/chat-presence'
FAIL src/lib/chat-typing.test.ts   - Cannot find module '@/lib/chat-typing'
FAIL src/lib/chat-messages.test.ts - Cannot find module '@/lib/chat-messages'
Test Files  3 failed (3)   Tests  no tests
```

### GREEN
Same command after implementation (`.superpowers/sdd/task-1-green.txt`):
```
✓ src/lib/chat-presence.test.ts (5 tests)
✓ src/lib/chat-typing.test.ts (4 tests)
✓ src/lib/chat-messages.test.ts (3 tests)
Test Files  3 passed (3)   Tests  12 passed (12)
```
Full suite `npx vitest run`: 9 files, 35 tests passed. `npx tsc --noEmit`: no errors.

## Files changed
- `prisma/schema.prisma`
  - `User`: `lastSeenAt DateTime?`, `reactions MessageReaction[]`
  - `Couple`: `pinnedMessageId String?` + real FK relation `pinnedMessage Message? @relation("CouplePin", ... onDelete: SetNull)`; `messages` now uses named relation `"CoupleMessages"`. `prisma validate` OK, so the plain-id fallback was NOT needed.
  - `Message`: `editedAt`, `replyToId`, `quoteText`, `replyTo`/`replies` (`"MessageReply"`, SetNull), `reactions`, `pinnedByCouples Couple[] @relation("CouplePin")` (list, since pinnedMessageId is not unique), `@@index([coupleId, editedAt])`
  - New `MessageReaction` (unique `[messageId,userId]`, index `updatedAt`, cascade deletes)
- `src/lib/constants.ts`: `CHAT_REACTIONS` (❤️ 😂 😮 😢 🔥 👍) + `ChatReaction` type
- New: `src/lib/chat-presence.ts` (+test), `src/lib/chat-typing.ts` (+test), `src/lib/chat-messages.ts` (+test)
  - `chat-messages.ts` exports `postMessageSchema`, `patchMessageSchema`, `reactionSchema`, `aggregateReactions`, `MESSAGE_INCLUDE`, `MessageDto`, `toMessageDto`
  - typing store uses `globalThis.__loveTyping`, TTL 3000ms, `_resetTypingForTests` exported
- `src/lib/demo-store.ts`: `messageReaction: []` table; `lastSeenAt: null` on users; `pinnedMessageId: null` on couple; all demo messages get `editedAt/replyToId/quoteText: null` (via map over seed)
- `src/lib/demo-prisma.ts`: registered `messageReaction`

## DB
`npx prisma generate` and `npx prisma db push` (local sqlite dev.db) succeeded: "database is now in sync".

## Notes / concerns
- Brief's emoji list was mojibake (`рџ‚` etc.); I interpreted as ❤️ 😂 😮 😢 🔥 👍. Test files in the brief were likewise re-typed with proper UTF-8 Cyrillic/emoji.
- `MessageDto.replyTo` shape: `{ id, body, authorId, authorName }` and dates are ISO strings — my design choice (brief only gave the name); later tasks should use it consistently.
- `MESSAGE_INCLUDE.replyTo` selects author displayName so `authorName` can be populated.
- Demo prisma layer does not handle nested `replyTo`/`reactions` includes yet (applyInclude only knows author/couple/members); later API tasks that use `MESSAGE_INCLUDE` in demo mode will need that support. Out of scope for Task 1 brief.
- `formatLastSeen` with null returns a "давно не заходил(а)" fallback (brief didn't specify).
- Existing `/api/messages` routes untouched.
