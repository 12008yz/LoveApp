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
  it("uses Р±С‹Р» for boy when offline", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const at = new Date(now.getTime() - 5 * 60_000);
    expect(formatLastSeen(at, "boy", now)).toMatch(/Р±С‹Р»/i);
  });
  it("uses Р±С‹Р»Р° for girl", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const at = new Date(now.getTime() - 5 * 60_000);
    expect(formatLastSeen(at, "girl", now)).toMatch(/Р±С‹Р»Р°/i);
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
        { emoji: "вќ¤пёЏ", userId: "a" },
        { emoji: "вќ¤пёЏ", userId: "b" },
        { emoji: "рџ”Ґ", userId: "a" },
      ],
      "a",
    );
    expect(out).toEqual([
      { emoji: "вќ¤пёЏ", count: 2, me: true },
      { emoji: "рџ”Ґ", count: 1, me: true },
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

- [ ] **Step 2: Run tests вЂ” expect FAIL**

Run: `npx vitest run src/lib/chat-presence.test.ts src/lib/chat-typing.test.ts src/lib/chat-messages.test.ts`  
Expected: modules/exports missing

- [ ] **Step 3: Implement helpers + constants**

Add to `constants.ts`:

```ts
export const CHAT_REACTIONS = ["вќ¤пёЏ", "рџ‚", "рџ®", "рџў", "рџ”Ґ", "рџ‘Ќ"] as const;
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

On `Couple` add: `pinnedMessageId String?` and optional `pinnedMessage Message? @relation("CouplePin", fields: [pinnedMessageId], references: [id], onDelete: SetNull)` вЂ” if Prisma complains about relation cycles, store `pinnedMessageId` as plain `String?` **without** FK relation (acceptable fallback; document in code comment).

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


