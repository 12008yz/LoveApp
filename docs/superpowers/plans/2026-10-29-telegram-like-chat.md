# Telegram-like Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade couple chat to Telegram-like text UX: composer, reply/quote, edit, presence, typing, reactions, pin, search — on existing SSE + Prisma.

**Architecture:** Extend `Message` / `User` / `Couple` + new `MessageReaction`; pure helpers for DTO/presence copy; REST for mutations; SSE poll emits new event types; `chat-client.tsx` gains header + actions while keeping wallpaper/bubbles/stickers.

**Tech Stack:** Next.js 16 App Router, Prisma 5 (SQLite local / Postgres prod), vitest, existing EventSource SSE, CSS in `globals.css`.

## Global Constraints

- No media, delete, or forward in this release
- No WebSocket; keep SSE ~1.5s
- Search MUST NOT mark messages read (separate `/api/messages/search`)
- One reaction per user per message (`@@unique([messageId, userId])`)
- `quoteText` only with `replyToId`; max 500 chars
- Typing store is in-memory (single Node process)
- Presence heartbeat only while chat page visible (~25s)
- Push only on new message POST
- Do not commit unless the user explicitly asks (repo rule); skip commit steps or stop before them
- Match existing Russian UI copy and `.chat-*` styles

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Schema fields + `MessageReaction` |
| `src/lib/constants.ts` | `CHAT_REACTIONS` allowlist |
| `src/lib/chat-presence.ts` | `formatLastSeen`, online threshold |
| `src/lib/chat-typing.ts` | In-memory typing map |
| `src/lib/chat-messages.ts` | Zod schemas, reaction aggregate, message include/DTO mapper |
| `src/app/api/messages/route.ts` | GET returns `{ messages, pinnedMessageId }`; POST reply/quote |
| `src/app/api/messages/[id]/route.ts` | PATCH edit |
| `src/app/api/messages/[id]/reactions/route.ts` | Toggle reaction |
| `src/app/api/messages/search/route.ts` | Search without read side-effect |
| `src/app/api/chat/pin/route.ts` | Set/clear pin |
| `src/app/api/chat/presence/route.ts` | Heartbeat |
| `src/app/api/chat/typing/route.ts` | Typing ping |
| `src/app/api/messages/stream/route.ts` | Extra SSE event types |
| `src/app/(app)/chat/page.tsx` | Pass partner props into client |
| `src/app/(app)/chat/chat-client.tsx` | Full UI upgrade |
| `src/app/globals.css` | Header, pin bar, reply, composer textarea, menus |
| `src/lib/demo-store.ts` / `demo-prisma.ts` | Demo shapes |
| `src/lib/chat-presence.test.ts` etc. | Unit tests |

---

### Task 1: Schema + constants + pure helpers (TDD)

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/constants.ts`
- Create: `src/lib/chat-presence.ts`, `src/lib/chat-presence.test.ts`
- Create: `src/lib/chat-typing.ts`, `src/lib/chat-typing.test.ts`
- Create: `src/lib/chat-messages.ts`, `src/lib/chat-messages.test.ts`

**Interfaces:**
- Produces:
  - `CHAT_REACTIONS: readonly string[]`
  - `ONLINE_MS = 45_000`
  - `formatLastSeen(lastSeenAt: Date \| string \| null \| undefined, genderRole: 'boy' \| 'girl' \| string, now?: Date): string`
  - `isOnline(lastSeenAt, now?): boolean`
  - `setTyping(coupleId, userId): void` / `clearTyping(coupleId, userId): void` / `getPartnerTyping(coupleId, selfId): { userId: string } \| null` (TTL 3000ms)
  - `postMessageSchema`, `patchMessageSchema`, `reactionSchema` (zod)
  - `aggregateReactions(rows: { emoji: string; userId: string }[], me: string): { emoji: string; count: number; me: boolean }[]`
  - `MESSAGE_INCLUDE` prisma include object + `toMessageDto(message, me): MessageDto`

- [ ] **Step 1: Write failing tests for presence + typing + reactions aggregate**

Create `src/lib/chat-presence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatLastSeen, isOnline, ONLINE_MS } from "@/lib/chat-presence";

describe("isOnline", () => {
  it("true within 45s", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(isOnline(new Date(now.getTime() - 10_000), now)).toBe(true);
  });
  it("false after 45s", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(isOnline(new Date(now.getTime() - ONLINE_MS - 1), now)).toBe(false);
  });
  it("false when null", () => {
    expect(isOnline(null)).toBe(false);
  });
});

describe("formatLastSeen", () => {
  it("uses был for boy when offline", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const at = new Date(now.getTime() - 5 * 60_000);
    expect(formatLastSeen(at, "boy", now)).toMatch(/был/i);
  });
  it("uses была for girl", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const at = new Date(now.getTime() - 5 * 60_000);
    expect(formatLastSeen(at, "girl", now)).toMatch(/была/i);
  });
});
```

Create `src/lib/chat-typing.test.ts`:

```ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { setTyping, clearTyping, getPartnerTyping, _resetTypingForTests } from "@/lib/chat-typing";

beforeEach(() => _resetTypingForTests());

describe("chat-typing", () => {
  it("returns partner when fresh", () => {
    setTyping("c1", "u2");
    expect(getPartnerTyping("c1", "u1")?.userId).toBe("u2");
  });
  it("ignores self", () => {
    setTyping("c1", "u1");
    expect(getPartnerTyping("c1", "u1")).toBeNull();
  });
  it("expires after TTL", () => {
    vi.useFakeTimers();
    setTyping("c1", "u2");
    vi.advanceTimersByTime(3001);
    expect(getPartnerTyping("c1", "u1")).toBeNull();
    vi.useRealTimers();
  });
  it("clearTyping removes", () => {
    setTyping("c1", "u2");
    clearTyping("c1", "u2");
    expect(getPartnerTyping("c1", "u1")).toBeNull();
  });
});
```

Create `src/lib/chat-messages.test.ts` covering `aggregateReactions` and zod reject `quoteText` without `replyToId`:

```ts
import { describe, expect, it } from "vitest";
import { aggregateReactions, postMessageSchema } from "@/lib/chat-messages";

describe("aggregateReactions", () => {
  it("marks me and counts", () => {
    const out = aggregateReactions(
      [
        { emoji: "❤️", userId: "a" },
        { emoji: "❤️", userId: "b" },
        { emoji: "🔥", userId: "a" },
      ],
      "a",
    );
    expect(out).toEqual([
      { emoji: "❤️", count: 2, me: true },
      { emoji: "🔥", count: 1, me: true },
    ]);
  });
});

describe("postMessageSchema", () => {
  it("rejects quote without replyToId", () => {
    const r = postMessageSchema.safeParse({ body: "hi", quoteText: "x" });
    expect(r.success).toBe(false);
  });
  it("accepts reply + quote", () => {
    const r = postMessageSchema.safeParse({
      body: "hi",
      replyToId: "clxxxxxxxx",
      quoteText: "part",
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/lib/chat-presence.test.ts src/lib/chat-typing.test.ts src/lib/chat-messages.test.ts`  
Expected: modules/exports missing

- [ ] **Step 3: Implement helpers + constants**

Add to `constants.ts`:

```ts
export const CHAT_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"] as const;
export type ChatReaction = (typeof CHAT_REACTIONS)[number];
```

Implement `chat-presence.ts`, `chat-typing.ts` (export `_resetTypingForTests` for vitest), `chat-messages.ts` with zod:

```ts
export const postMessageSchema = z
  .object({
    body: z.string().min(1).max(4000),
    replyToId: z.string().min(1).optional(),
    quoteText: z.string().min(1).max(500).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.quoteText && !val.replyToId) {
      ctx.addIssue({ code: "custom", message: "quote requires replyToId", path: ["quoteText"] });
    }
  });
```

- [ ] **Step 4: Update Prisma schema**

On `User` add: `lastSeenAt DateTime?` and `reactions MessageReaction[]`

On `Couple` add: `pinnedMessageId String?` and optional `pinnedMessage Message? @relation("CouplePin", fields: [pinnedMessageId], references: [id], onDelete: SetNull)` — if Prisma complains about relation cycles, store `pinnedMessageId` as plain `String?` **without** FK relation (acceptable fallback; document in code comment).

On `Message` add:

```prisma
  editedAt   DateTime?
  replyToId  String?
  quoteText  String?

  replyTo    Message?  @relation("MessageReply", fields: [replyToId], references: [id], onDelete: SetNull)
  replies    Message[] @relation("MessageReply")
  reactions  MessageReaction[]
  // if using CouplePin relation, add: pinnedByCouple Couple? @relation("CouplePin")

  @@index([coupleId, editedAt])
```

New model:

```prisma
model MessageReaction {
  id        String   @id @default(cuid())
  messageId String
  userId    String
  emoji     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  message Message @relation(...)
  user    User    @relation(...)

  @@unique([messageId, userId])
  @@index([updatedAt])
}
```

- [ ] **Step 5: db push + regenerate + re-run tests**

Run: `npx prisma generate` then `npx prisma db push` (local sqlite)  
Run: `npx vitest run src/lib/chat-presence.test.ts src/lib/chat-typing.test.ts src/lib/chat-messages.test.ts`  
Expected: PASS

- [ ] **Step 6: Update demo-store / demo-prisma**

Add null/default fields on demo messages (`editedAt`, `replyToId`, `quoteText`), empty `messageReaction: []`, `lastSeenAt` on users, `pinnedMessageId: null` on couple; register `messageReaction` in demo-prisma table list like other models.

---

### Task 2: Message APIs (GET/POST/PATCH + search)

**Files:**
- Modify: `src/app/api/messages/route.ts`
- Create: `src/app/api/messages/[id]/route.ts`
- Create: `src/app/api/messages/search/route.ts`
- Extend: `src/lib/chat-messages.ts` with `loadMessageDto(id, me)` if useful

**Interfaces:**
- Consumes: `postMessageSchema`, `patchMessageSchema`, `MESSAGE_INCLUDE`, `toMessageDto`
- Produces: GET `{ messages: MessageDto[]; pinnedMessageId: string | null }`; POST `{ message }`; PATCH `{ message }`; search `{ messages }`

- [ ] **Step 1: Implement GET/POST updates in `route.ts`**

- Use `MESSAGE_INCLUDE` (author, replyTo+author, reactions)
- Map via `toMessageDto(..., authResult.user.id)`
- Return `pinnedMessageId` from `authResult.couple` (reload couple select if needed)
- POST: validate schema; if `replyToId`, `findFirst` same `coupleId` or 404; create with fields; `clearTyping(coupleId, userId)`; push as today; return DTO
- Keep mark-read behavior on GET only

- [ ] **Step 2: Implement PATCH `messages/[id]/route.ts`**

- Author must match; 403 otherwise
- Update `body` + `editedAt: new Date()`
- Return DTO

- [ ] **Step 3: Implement `messages/search/route.ts`**

```ts
const q = searchParams.get("q")?.trim() ?? "";
if (q.length < 1) return NextResponse.json({ messages: [] });
// prisma.message.findMany where coupleId + body contains q
// Postgres: { contains: q, mode: "insensitive" }
// SQLite: { contains: q } only — branch on process.env.DATABASE_URL starts with postgres
// take 50, orderBy createdAt desc
// DO NOT updateMany readAt
```

- [ ] **Step 4: Manual smoke**

Run: `npm run dev` — login, GET `/api/messages` shape includes `pinnedMessageId`; POST with reply; PATCH own message.  
Expected: 201/200 JSON with new fields

---

### Task 3: Reactions, pin, presence, typing routes

**Files:**
- Create: `src/app/api/messages/[id]/reactions/route.ts`
- Create: `src/app/api/chat/pin/route.ts`
- Create: `src/app/api/chat/presence/route.ts`
- Create: `src/app/api/chat/typing/route.ts`

- [ ] **Step 1: Reactions toggle**

- Validate emoji ∈ `CHAT_REACTIONS`
- Ensure message same couple
- If existing reaction same emoji → delete; if different → update emoji; else create
- Return `{ messageId, reactions: aggregateReactions(...) }`

- [ ] **Step 2: Pin**

```ts
// body: { messageId: string | null }
// null → couple.update pinnedMessageId null
// string → verify message.coupleId → update
```

- [ ] **Step 3: Presence + typing**

- presence: `prisma.user.update({ where: { id }, data: { lastSeenAt: new Date() } })` → `{ ok: true, lastSeenAt }`
- typing: `setTyping(couple.id, user.id)` → `{ ok: true }`

- [ ] **Step 4: Smoke with curl/fetch while logged in** (or browser network tab)

---

### Task 4: SSE stream extensions

**Files:**
- Modify: `src/app/api/messages/stream/route.ts`

- [ ] **Step 1: Extend poll loop**

Track cursors: `lastCheck` (createdAt), `lastEditCheck` (editedAt), `lastReactionCheck` (updatedAt), `lastPin` snapshot, `lastPartnerSeen` snapshot.

Each tick after existing messages/reads logic:

1. `message_updated`: find messages where `coupleId` and `editedAt > lastEditCheck` and `editedAt != null`, include full MESSAGE_INCLUDE, map DTOs, advance cursor to max editedAt
2. `reaction`: find MessageReaction where message.coupleId and `updatedAt > lastReactionCheck`; for each distinct messageId re-aggregate; emit `{ type: "reaction", messageId, reactions }`; advance cursor
3. `pin`: read couple.pinnedMessageId; if !== lastPin emit `{ type: "pin", messageId }`
4. `presence`: partner user lastSeenAt; if changed emit
5. `typing`: `getPartnerTyping` → emit `{ type: "typing", userId, active: boolean }` when active changes vs previous bool

Include DTOs consistent with GET. Keep ping when idle.

- [ ] **Step 2: Verify EventSource in two browsers** — edit appears on other side without refresh

---

### Task 5: Chat page props + client shell (header, presence, typing, composer)

**Files:**
- Modify: `src/app/(app)/chat/page.tsx`
- Modify: `src/app/(app)/chat/chat-client.tsx` (large)
- Modify: `src/app/globals.css`

**Interfaces:**
- `ChatClient` props: `{ partner: { id, displayName, avatarPath, genderRole, lastSeenAt: string | null } }`

- [ ] **Step 1: page.tsx passes partner**

```tsx
export default async function ChatPage() {
  const { membership, couple } = await requireCouple();
  const partnerMember = couple.members.find((m) => m.userId !== membership.userId);
  const partner = partnerMember
    ? {
        id: partnerMember.user.id,
        displayName: partnerMember.user.displayName,
        avatarPath: partnerMember.user.avatarPath,
        genderRole: partnerMember.genderRole,
        lastSeenAt: partnerMember.user.lastSeenAt?.toISOString() ?? null,
      }
    : null;
  return <ChatClient partner={partner} />;
}
```

Ensure `requireCouple` include selects `lastSeenAt` on users (update session helper include if missing).

- [ ] **Step 2: Header UI + presence heartbeat + typing indicator state**

- Render `.chat-header` with avatar, name, subtitle from `formatLastSeen` / `isOnline` / typing
- `useEffect`: POST `/api/chat/presence` on mount + every 25s while `document.visibilityState === 'visible'`
- SSE handler: `presence`, `typing`
- Move profile button from composer into header

- [ ] **Step 3: Composer textarea**

- Replace `<input>` with auto-grow `<textarea className="chat-composer__input">`
- Enter submits (preventDefault) if not Shift; Shift+Enter newline
- On change debounce 1s → POST `/api/chat/typing` if text non-empty
- CSS: max-height ~6 lines, resize none

- [ ] **Step 4: Wire GET shape**

- `setMessages(json.messages)`; `setPinnedMessageId(json.pinnedMessageId)`
- SSE: handle `message_updated` (merge by id), `reaction`, `pin`, `presence`, `typing`

---

### Task 6: Reply, quote, edit, reactions, pin, search, long-press

**Files:**
- Modify: `chat-client.tsx`, `globals.css`

- [ ] **Step 1: Reply / quote / edit modes in composer**

State: `replyTo: MessageDto | null`, `quoteText: string | null`, `editingId: string | null`

- Send POST includes reply fields; sticker send keeps reply
- Edit: PATCH then clear editing mode; show «изменено» in bubble meta when `editedAt`
- Reply chip on bubble; composer bar with cancel

- [ ] **Step 2: Long-press / context menu**

- ~400ms pointerdown timer; cancel on move > 10px
- Menu actions per spec (no delete/forward)
- Quote: if `window.getSelection()` text is inside bubble, set quoteText

- [ ] **Step 3: Reactions UI**

- Row under bubble; menu strip; POST reactions; apply SSE `reaction`

- [ ] **Step 4: Pin bar + search panel**

- Pin bar under header
- Search: input → `/api/messages/search?q=`; list results; on tap `scrollIntoView` on `[data-message-id=...]` if in DOM, else muted “Нет в загруженной истории”

- [ ] **Step 5: Visual pass**

- Header/pin/composer/reply CSS consistent with existing rose chat theme
- Ensure `.chat-page` flex still fits under app shell nav

---

### Task 7: Verification

- [ ] **Step 1: Unit tests**

Run: `npx vitest run src/lib/chat-presence.test.ts src/lib/chat-typing.test.ts src/lib/chat-messages.test.ts`  
Expected: PASS

- [ ] **Step 2: Lint/typecheck**

Run: `npx tsc --noEmit`  
Expected: exit 0

- [ ] **Step 3: Manual checklist (two accounts)**

- [ ] Multiline composer + Enter send  
- [ ] Reply + quote preview + scroll to original  
- [ ] Edit sync via SSE ≤2s  
- [ ] Reaction toggle both sides  
- [ ] Pin / unpin  
- [ ] Online / last seen gendered  
- [ ] Typing subtitle  
- [ ] Search does not clear unread on partner side oddly (no mass read)  
- [ ] Stickers + ✓✓ + push still work  

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Message editedAt/reply/quote | 1, 2, 6 |
| MessageReaction + updatedAt + one per user | 1, 3 |
| Couple.pinnedMessageId | 1, 3, 6 |
| User.lastSeenAt | 1, 3, 5 |
| Search separate no mark-read | 2 |
| PATCH edit | 2 |
| Presence/typing APIs | 3 |
| SSE events | 4 |
| Header / composer / actions | 5–6 |
| No delete/forward/media | Global + menus |
| Demo store | 1 |
| Push only on create | 2 (unchanged notifyPartner on POST only) |

## Placeholder scan

No TBD remaining. Prisma Couple↔Message pin FK may use string-only fallback if relation cycle fails — called out in Task 1 Step 4.
