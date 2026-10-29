/** A user counts as online if seen within this window. */
export const ONLINE_MS = 45_000;

type SeenAt = Date | string | null | undefined;

function toDate(value: SeenAt): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isOnline(lastSeenAt: SeenAt, now: Date = new Date()): boolean {
  const at = toDate(lastSeenAt);
  if (!at) return false;
  return now.getTime() - at.getTime() <= ONLINE_MS;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function hhmm(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Telegram-style presence line, gendered by couple role ("был" / "была"). */
export function formatLastSeen(
  lastSeenAt: SeenAt,
  genderRole: "boy" | "girl" | string,
  now: Date = new Date(),
): string {
  const at = toDate(lastSeenAt);
  if (!at) return "давно не заходил" + (genderRole === "girl" ? "а" : "");
  if (isOnline(at, now)) return "в сети";

  const verb = genderRole === "girl" ? "была" : "был";
  const diffMs = now.getTime() - at.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return `${verb} только что`;
  if (minutes < 60) return `${verb} ${minutes} мин. назад`;

  if (sameDay(at, now)) return `${verb} сегодня в ${hhmm(at)}`;

  const yesterday = new Date(now.getTime() - 86_400_000);
  if (sameDay(at, yesterday)) return `${verb} вчера в ${hhmm(at)}`;

  return `${verb} ${pad(at.getDate())}.${pad(at.getMonth() + 1)} в ${hhmm(at)}`;
}
