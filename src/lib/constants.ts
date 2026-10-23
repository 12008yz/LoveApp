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
  { href: "/pings", label: "Пинги" },
  { href: "/calendar", label: "Календарь" },
  { href: "/letters", label: "Письма" },
  { href: "/map", label: "Карта" },
  { href: "/timeline", label: "История" },
  { href: "/games", label: "Игры" },
  { href: "/wishlist", label: "Желания" },
  { href: "/care", label: "Забота" },
  { href: "/mood", label: "Настроение" },
] as const;

/** All destinations (home tiles, etc.). */
export const NAV_ITEMS = [
  ...PRIMARY_NAV.map(({ href, label }) => ({ href, label })),
  ...MORE_NAV,
] as const;
