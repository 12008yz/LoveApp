export type StickerEmojiItem = { type: "emoji"; value: string };
export type StickerImageItem = {
  type: "image";
  id: string;
  src: string;
  label: string;
};
export type StickerItem = StickerEmojiItem | StickerImageItem;

export type StickerPack = {
  id: string;
  label: string;
  items: StickerItem[];
};

const STICKER_TOKEN_RE = /^::sticker:([a-z0-9/-]+)::$/i;

export function encodeStickerToken(id: string) {
  return `::sticker:${id}::`;
}

export function parseStickerToken(body: string): string | null {
  const m = body.trim().match(STICKER_TOKEN_RE);
  return m?.[1]?.toLowerCase() ?? null;
}

export function isImageStickerBody(body: string) {
  return Boolean(parseStickerToken(body));
}

export function isEmojiStickerBody(body: string) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 8 || /\n/.test(trimmed)) return false;
  if (parseStickerToken(trimmed)) return false;
  return /\p{Extended_Pictographic}/u.test(trimmed);
}

export function isStickerMessageBody(body: string) {
  return isImageStickerBody(body) || isEmojiStickerBody(body);
}

const IMAGE_STICKERS: Record<string, { src: string; label: string }> = {
  "cute/heart-glow": { src: "/stickers/cute/heart-glow.svg", label: "Сердце" },
  "cute/bear-hug": { src: "/stickers/cute/bear-hug.svg", label: "Обнимашки" },
  "cute/coffee-date": { src: "/stickers/cute/coffee-date.svg", label: "Кофе" },
  "cute/moon-kiss": { src: "/stickers/cute/moon-kiss.svg", label: "Луна" },
  "cute/love-letter": { src: "/stickers/cute/love-letter.svg", label: "Письмо" },
  "cute/cozy-home": { src: "/stickers/cute/cozy-home.svg", label: "Дом" },
  "cute/spark-love": { src: "/stickers/cute/spark-love.svg", label: "Искры" },
  "cute/cat-blush": { src: "/stickers/cute/cat-blush.svg", label: "Котик" },
  "cute/bouquet": { src: "/stickers/cute/bouquet.svg", label: "Букет" },
  "cute/sleepy": { src: "/stickers/cute/sleepy.svg", label: "Сплю" },
  "cute/high-five": { src: "/stickers/cute/high-five.svg", label: "Ура" },
  "cute/ring": { src: "/stickers/cute/ring.svg", label: "Кольцо" },
};

export function stickerImageById(id: string) {
  return IMAGE_STICKERS[id] ?? null;
}

export function stickerPreviewLabel(body: string): string | null {
  const id = parseStickerToken(body);
  if (id) return stickerImageById(id)?.label ?? "Стикер";
  if (isEmojiStickerBody(body)) return body.trim();
  return null;
}

function emojiItems(values: string[]): StickerEmojiItem[] {
  return values.map((value) => ({ type: "emoji", value }));
}

function imageItems(ids: string[]): StickerImageItem[] {
  return ids.map((id) => {
    const meta = IMAGE_STICKERS[id];
    return {
      type: "image" as const,
      id,
      src: meta.src,
      label: meta.label,
    };
  });
}

/** Curated couple emoji — fewer, more useful. */
const EMOJI_LOVE = emojiItems([
  "❤️",
  "🥰",
  "😘",
  "💋",
  "🤗",
  "🥹",
  "🥺",
  "😊",
  "💞",
  "💘",
  "✨",
  "🌙",
  "☕",
  "🍓",
  "🌸",
  "🐻",
  "💌",
  "🏠",
]);

const EMOJI_VIBES = emojiItems([
  "😂",
  "🔥",
  "👍",
  "👋",
  "💪",
  "😴",
  "😌",
  "🤔",
  "😅",
  "😎",
  "🫶",
  "💯",
  "🎉",
  "👀",
  "🫡",
  "🫣",
]);

const CUTE_IMAGES = imageItems([
  "cute/heart-glow",
  "cute/bear-hug",
  "cute/coffee-date",
  "cute/moon-kiss",
  "cute/love-letter",
  "cute/cozy-home",
  "cute/spark-love",
  "cute/cat-blush",
  "cute/bouquet",
  "cute/sleepy",
  "cute/high-five",
  "cute/ring",
]);

/** Single pack: vibes first, then love emoji, then cute images. */
export const STICKER_ITEMS: StickerItem[] = [...EMOJI_VIBES, ...EMOJI_LOVE, ...CUTE_IMAGES];

export const STICKER_PACKS: StickerPack[] = [
  { id: "all", label: "Стикеры", items: STICKER_ITEMS },
];

/** @deprecated use STICKER_ITEMS */
export const CHAT_STICKERS = EMOJI_VIBES.map((i) => i.value);
