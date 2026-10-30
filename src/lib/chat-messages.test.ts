import { describe, expect, it } from "vitest";
import {
  aggregateReactions,
  mediaPreviewLabel,
  postMessageSchema,
  pushPreviewForMessage,
  toMessageDto,
  truncateReplyPreview,
} from "@/lib/chat-messages";

describe("aggregateReactions", () => {
  it("marks me and counts (one emoji per user, as in DB unique)", () => {
    const out = aggregateReactions(
      [
        { emoji: "❤️", userId: "a" },
        { emoji: "❤️", userId: "b" },
        { emoji: "🔥", userId: "b" },
      ],
      "a",
    );
    // Note: DB enforces @@unique([messageId,userId]), so user b wouldn't hold
    // both rows at once — this only exercises the aggregator.
    expect(out).toEqual([
      { emoji: "❤️", count: 2, me: true },
      { emoji: "🔥", count: 1, me: false },
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

describe("truncateReplyPreview / toMessageDto", () => {
  it("truncates long reply preview to ~120", () => {
    const long = "x".repeat(200);
    expect(truncateReplyPreview(long).length).toBe(120);
    expect(truncateReplyPreview(long).endsWith("…")).toBe(true);
  });

  it("maps replyTo.author.displayName per spec", () => {
    const dto = toMessageDto(
      {
        id: "m1",
        coupleId: "c1",
        authorId: "a1",
        body: "hello",
        createdAt: new Date("2026-10-29T12:00:00Z"),
        author: { id: "a1", displayName: "Me", avatarPath: null },
        replyTo: {
          id: "m0",
          body: "orig",
          authorId: "a2",
          author: { id: "a2", displayName: "Partner" },
        },
        reactions: [],
      },
      "a1",
    );
    expect(dto.replyTo).toEqual({
      id: "m0",
      body: "orig",
      authorId: "a2",
      author: { displayName: "Partner" },
    });
    expect(dto.attachments).toEqual([]);
  });

  it("uses media label when reply body is empty", () => {
    const dto = toMessageDto(
      {
        id: "m1",
        coupleId: "c1",
        authorId: "a1",
        body: "ok",
        createdAt: new Date("2026-10-29T12:00:00Z"),
        author: { id: "a1", displayName: "Me", avatarPath: null },
        replyTo: {
          id: "m0",
          body: "",
          authorId: "a2",
          author: { id: "a2", displayName: "Partner" },
          attachments: [{ kind: "image" }, { kind: "video" }],
        },
        reactions: [],
        attachments: [],
      },
      "a1",
    );
    expect(dto.replyTo?.body).toBe("Альбом · 2");
  });
});

describe("mediaPreviewLabel / pushPreviewForMessage", () => {
  it("labels single and album media", () => {
    expect(mediaPreviewLabel([{ kind: "image" }])).toBe("Фото");
    expect(mediaPreviewLabel([{ kind: "video" }])).toBe("Видео");
    expect(mediaPreviewLabel([{ kind: "image" }, { kind: "image" }])).toBe("Альбом · 2");
  });

  it("prefers caption text for push preview", () => {
    expect(pushPreviewForMessage("привет", [{ kind: "image" }])).toBe("привет");
    expect(pushPreviewForMessage("  ", [{ kind: "video" }])).toBe("Видео");
    expect(pushPreviewForMessage("::sticker:cute/heart-glow::", null)).toBe("Сердце");
  });
});
