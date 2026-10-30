export const MOOD_PINGS = [
  { kind: "miss_you", label: "Скучаю", tone: "rose" },
  { kind: "hug", label: "Обними", tone: "peach" },
  { kind: "love", label: "Люблю", tone: "crimson" },
  { kind: "busy", label: "Занят(а)", tone: "slate" },
  { kind: "tired", label: "Устал(а)", tone: "violet" },
  { kind: "happy", label: "Рад(а)", tone: "mint" },
] as const;

export type MoodPingKind = (typeof MOOD_PINGS)[number]["kind"];

/** Primary bottom-nav destinations (mobile first). */
export const PRIMARY_NAV = [
  { href: "/home", label: "Дом", icon: "home" },
  { href: "/chat", label: "Чат", icon: "chat" },
  { href: "/diary", label: "Дневник", icon: "diary" },
  { href: "/album", label: "Альбом", icon: "album" },
] as const;

/** Everything else — “Ещё” sheet. */
export const MORE_NAV = [
  { href: "/pings", label: "Сигналы" },
  { href: "/calendar", label: "Календарь" },
  { href: "/letters", label: "Письма" },
  { href: "/map", label: "Свидания" },
  { href: "/constellation", label: "Созвездие" },
  { href: "/games", label: "Игры" },
  { href: "/wishlist", label: "Желания" },
  { href: "/care", label: "Забота" },
  { href: "/mood", label: "Настроение" },
  { href: "/settings", label: "Настройки" },
] as const;

/** Quick reactions for chat messages (one per user per message). */
export const CHAT_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"] as const;
export type ChatReaction = (typeof CHAT_REACTIONS)[number];

/** @deprecated Prefer STICKER_PACKS from @/lib/stickers */
export { CHAT_STICKERS, STICKER_PACKS } from "@/lib/stickers";

export const GAME_HUB = [
  {
    id: "tictactoe",
    title: "Крестики-нолики",
    blurb: "Классика на двоих",
    playable: true as const,
  },
  {
    id: "words",
    title: "Слова",
    blurb: "Загадай слово партнёру",
    playable: true as const,
  },
  {
    id: "truth",
    title: "Правда или действие",
    blurb: "Скоро — карточки для двоих",
    playable: false as const,
  },
  {
    id: "quiz",
    title: "Кто лучше знает",
    blurb: "Скоро — вопросы о вас",
    playable: false as const,
  },
  {
    id: "memory",
    title: "Память",
    blurb: "Скоро — парные карточки",
    playable: false as const,
  },
] as const;

/** All destinations (home tiles, etc.). */
export const NAV_ITEMS = [
  ...PRIMARY_NAV.map(({ href, label }) => ({ href, label })),
  ...MORE_NAV,
] as const;
