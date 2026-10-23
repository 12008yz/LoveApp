export const MOOD_PINGS = [
  { kind: "miss_you", label: "Скучаю", tone: "rose" },
  { kind: "hug", label: "Обними", tone: "peach" },
  { kind: "love", label: "Люблю", tone: "crimson" },
  { kind: "busy", label: "Занят(а)", tone: "slate" },
  { kind: "tired", label: "Устал(а)", tone: "violet" },
  { kind: "happy", label: "Рад(а)", tone: "mint" },
] as const;

export type MoodPingKind = (typeof MOOD_PINGS)[number]["kind"];

export const NAV_ITEMS = [
  { href: "/home", label: "Дом" },
  { href: "/chat", label: "Чат" },
  { href: "/diary", label: "Дневник" },
  { href: "/pings", label: "Пинги" },
  { href: "/calendar", label: "Календарь" },
  { href: "/letters", label: "Письма" },
  { href: "/album", label: "Альбом" },
  { href: "/map", label: "Карта" },
  { href: "/timeline", label: "История" },
  { href: "/games", label: "Игры" },
  { href: "/wishlist", label: "Желания" },
  { href: "/care", label: "Забота" },
  { href: "/mood", label: "Настроение" },
] as const;
