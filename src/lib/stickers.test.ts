import { describe, expect, it } from "vitest";
import {
  encodeStickerToken,
  isEmojiStickerBody,
  isStickerMessageBody,
  parseStickerToken,
  stickerImageById,
  stickerPreviewLabel,
  STICKER_ITEMS,
  STICKER_PACKS,
} from "@/lib/stickers";

describe("stickers", () => {
  it("encodes and parses image sticker tokens", () => {
    const token = encodeStickerToken("cute/heart-glow");
    expect(token).toBe("::sticker:cute/heart-glow::");
    expect(parseStickerToken(token)).toBe("cute/heart-glow");
    expect(parseStickerToken("  ::sticker:cute/bear-hug::  ")).toBe("cute/bear-hug");
    expect(parseStickerToken("hello")).toBe(null);
  });

  it("detects emoji vs image sticker bodies", () => {
    expect(isEmojiStickerBody("🥰")).toBe(true);
    expect(isEmojiStickerBody("привет")).toBe(false);
    expect(isStickerMessageBody(encodeStickerToken("cute/ring"))).toBe(true);
    expect(isEmojiStickerBody(encodeStickerToken("cute/ring"))).toBe(false);
  });

  it("resolves image metadata and packs", () => {
    expect(stickerImageById("cute/heart-glow")?.src).toContain("/stickers/cute/");
    expect(stickerPreviewLabel(encodeStickerToken("cute/heart-glow"))).toBe("Сердце");
    expect(STICKER_PACKS.length).toBe(1);
    expect(STICKER_ITEMS.length).toBeGreaterThan(20);
    expect(STICKER_ITEMS[0]).toMatchObject({ type: "emoji", value: "😂" });
  });
});
