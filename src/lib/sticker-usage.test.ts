import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  recordStickerUsageFromBody,
  readStickerUsage,
  sortStickersByUsage,
  stickerItemKey,
  stickerKeyFromBody,
  writeStickerUsage,
} from "@/lib/sticker-usage";
import { encodeStickerToken, type StickerItem } from "@/lib/stickers";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sticker-usage", () => {
  it("builds keys from items and bodies", () => {
    expect(stickerItemKey({ type: "emoji", value: "🔥" })).toBe("e:🔥");
    expect(stickerItemKey({ type: "image", id: "cute/ring", src: "/x", label: "Кольцо" })).toBe(
      "i:cute/ring",
    );
    expect(stickerKeyFromBody("😂")).toBe("e:😂");
    expect(stickerKeyFromBody(encodeStickerToken("cute/heart-glow"))).toBe("i:cute/heart-glow");
    expect(stickerKeyFromBody("привет")).toBe(null);
  });

  it("records and sorts by frequency, stable for ties", () => {
    const items: StickerItem[] = [
      { type: "emoji", value: "😂" },
      { type: "emoji", value: "🔥" },
      { type: "emoji", value: "👍" },
      {
        type: "image",
        id: "cute/ring",
        src: "/stickers/cute/ring.svg",
        label: "Кольцо",
      },
    ];

    writeStickerUsage({});
    recordStickerUsageFromBody("🔥");
    recordStickerUsageFromBody("🔥");
    recordStickerUsageFromBody(encodeStickerToken("cute/ring"));

    const usage = readStickerUsage();
    expect(usage["e:🔥"]).toBe(2);
    expect(usage["i:cute/ring"]).toBe(1);

    const sorted = sortStickersByUsage(items, usage);
    expect(sorted.map(stickerItemKey)).toEqual(["e:🔥", "i:cute/ring", "e:😂", "e:👍"]);
  });
});
