import type { StickerItem } from "@/lib/stickers";
import { isEmojiStickerBody, parseStickerToken } from "@/lib/stickers";

const STORAGE_KEY = "loveapp.sticker-usage.v1";

export type StickerUsageMap = Record<string, number>;

export function stickerItemKey(item: StickerItem): string {
  return item.type === "emoji" ? `e:${item.value}` : `i:${item.id}`;
}

export function stickerKeyFromBody(body: string): string | null {
  const trimmed = body.trim();
  const id = parseStickerToken(trimmed);
  if (id) return `i:${id}`;
  if (isEmojiStickerBody(trimmed)) return `e:${trimmed}`;
  return null;
}

export function readStickerUsage(): StickerUsageMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: StickerUsageMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const n = typeof v === "number" ? v : Number(v);
      if (k && Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
}

export function writeStickerUsage(map: StickerUsageMap) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

/** Bump usage for a sticker message body. Returns false if body is not a sticker. */
export function recordStickerUsageFromBody(body: string): boolean {
  const key = stickerKeyFromBody(body);
  if (!key) return false;
  const map = readStickerUsage();
  map[key] = (map[key] ?? 0) + 1;
  writeStickerUsage(map);
  return true;
}

/**
 * Most-used first. Equal counts keep original pack order (stable).
 */
export function sortStickersByUsage(
  items: readonly StickerItem[],
  usage: StickerUsageMap = readStickerUsage(),
): StickerItem[] {
  return items
    .map((item, index) => ({ item, index, count: usage[stickerItemKey(item)] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map((row) => row.item);
}
